/*
 * ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 * ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */

import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { handle } from './aws-config';
import createDebug from 'debug';

const debug = createDebug('litexa-logs');

export function pull(context, logger) {
  handle(context, logger, AWS);

  // log group should be derivable from the project name and variant, via the lambda name
  // log stream is a little more difficult, basically we'll need to scan for all active ones

  const globalParams = {
    params: {
      logGroupName: `/aws/lambda/${context.projectInfo.name}_${context.projectInfo.variant}_litexa_handler`
    }
  };

  if (context.cloudwatch == null) { context.cloudwatch = new AWS.CloudWatchLogs(globalParams); }

  debug(`global params: ${JSON.stringify(globalParams)}`);

  const timeRange = 60; // minutes
  const now = (new Date).getTime();
  let logName = (new Date).toLocaleString();
  context.startTime = now - (timeRange * 60 * 1000);
  context.endTime = now;

  return listLogStreams(context, logger)
  .catch(function(error) {
    if (error.code === "ResourceNotFoundException") {
      logger.log("no log records found for this skill yet");
      return Promise.resolve([]);
    }
    return Promise.reject(error);}).then(function(streams) {
    const promises = Array.from(streams).map((stream) =>
      pullLogStream(context, stream, logger));

    return Promise.all(promises);}).then(function(streams) {
    let info;
    const infos = [];
    let successes = 0;
    let fails = 0;
    for (let stream of Array.from(streams)) {
      for (let id in stream) {
        info = stream[id];
        infos.push(info);
        if (info.success) {
          successes += 1;
        } else {
          fails += 1;
        }
      }
    }

    infos.sort((a, b) => b.start - a.start);

    let all = [];
    all.push(`requests: ✔ success:${successes}, ✘ fail:${fails}\n`);

    for (info of Array.from(infos)) {
      all = all.concat(info.lines);
      all.push('\n');
    }

    const variantLogsRoot = path.join(context.logsRoot, context.projectInfo.variant);
    mkdirp.sync(variantLogsRoot);
    logName = logName.replace(/\//g, '-');
    // WINCOMPAT: Windows cannot have '\/:*?"<>|' in the filename
    logName = logName.replace(/:/g, '.');
    const filename = path.join(variantLogsRoot, `${logName}.log`);
    fs.writeFileSync(filename, all.join('\n'), 'utf8');
    return logger.log(`pulled ${filename}`);}).catch(function(error) {
    debug(`ERROR: ${JSON.stringify(error)}`);
    logger.error(error);
    throw "failed to pull logs";
  });
};

var listLogStreams = function(context, logger) {
  const params = {
    orderBy: 'LastEventTime',
    descending: true
  };
    //limit: 0
    //logStreamNamePrefix: 'STRING_VALUE'
    //nextToken: 'STRING_VALUE'

  debug(`listing streams ${JSON.stringify(params)}`);

  return context.cloudwatch.describeLogStreams(params).promise()
  .then(function(data) {
    const streams = [];
    debug(`listed streams ${JSON.stringify(data.logStreams)}`);
    for (let stream of Array.from(data.logStreams)) {
      if (stream.lastEventTimestamp < context.startTime) {
        break;
      }
      streams.push(stream.logStreamName);
    }
    return Promise.resolve(streams);
  });
};


var pullLogStream = function(context, streamName, logger) {
  const params = {
    logStreamName: streamName,
    startTime: context.startTime,
    endTime: context.endTime,
    // limit: 0 max
    // nextToken: 'STRING_VALUE'
    startFromHead: false
  };

  debug(`pulling log stream ${JSON.stringify(params)}`);

  return context.cloudwatch.getLogEvents(params).promise()
  .then(function(data) {
    const requests = {};

    const idRegex = /RequestId: ([a-z0-9\-]+)/i;
    const keyRegex = /^([A-Z]+)( [A-Z]+)?/;
    const durationRegex = /Duration: ([0-9\.]+) ms/i;
    const memoryRegex = /Memory Used: ([0-9\.]+) MB/i;
    let id = null;

    let start = null;
    for (let event of Array.from(data.events)) {

      var failed, message, time;
      let match = event.message.match(idRegex);
      if (match) {
        id = match[1];
        message = event.message.replace(match[0], '');
      } else {
        const parts = event.message.split('\t');
        if (parts.length > 2) {
          time = (new Date(parts[0])).toLocaleString();
          id = parts[1];
          message = parts.slice(2).join('\t');
        } else {
          ({
            message
          } = event);
        }
      }

      let key = null;
      let type = null;
      match = message.match(keyRegex);
      if (match && (match[0].length > 1)) {
        key = match[1];
        type = match[2] != null ? match[2].trim() : undefined;
        message = message.replace(match[0], '');
      }

      message = message.trim();

      let header = null;
      switch (key) {
        case 'START':
          start = event.timestamp;
          message = `--- ✘ ${time} [${id.slice(-8)}] ---`;
          failed = true;
          break;
        case 'REPORT':
          // Duration: 205.58 ms	Billed Duration: 300 ms 	Memory Size: 256 MB	Max Memory Used: 65 MB
          match = message.match(durationRegex);
          var duration = match != null ? match[1] : undefined;
          match = message.match(memoryRegex);
          var memory = match != null ? match[1] : undefined;
          time = (new Date(start)).toLocaleString();
          if (duration || memory) {
            const marker = failed ? '✘' : '✔';
            header = `--- ${marker} ${time} ${duration}ms ${memory}MB [${id.slice(-8)}] ---`;
            message = null;
          }
          break;
        case 'VERBOSE':
          if (type) {
            if (type === 'RESPONSE') {
              failed = false;
            }
            message = `${type}: ${message}`;
          }
          break;
        default:
          try {
            message = JSON.stringify(JSON.parse(message), null, 2);
          } catch (error) {}
          if (type) {
            message = `${type}: ${message}`;
          }
      }

      if (message || header) {
        let info = requests[id];
        if (info == null) {
          info = (requests[id] = {
            start: event.timestamp,
            lines: []
          });
        }
        if (message) {
          info.lines.push(message.trim());
        }
        if (header) {
          info.lines[0] = header.trim();
        }
        info.success = !failed;
      }
    }

    return Promise.resolve(requests);
  });
};

export default {
  pull
};
