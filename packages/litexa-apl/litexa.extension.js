/*
 *  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */

aplParser = require('./lib/aplParser')
aplCommandParser = require('./lib/aplCommandParser')
aplHandler = require('./dist/handler')
aplValidators = require('./lib/aplValidators')

module.exports = function(options, lib) {
  const compiler = {
    validators: {
      directives: {
        'Alexa.Presentation.APL.RenderDocument': aplValidators.renderDocumentDirective,
        'Alexa.Presentation.APL.ExecuteCommands': aplValidators.executeCommandsDirective
      },
      model: aplValidators.model,
      manifest: function({ validator, skill }) {
        // no manifest requirements
      }
    },
    validEventNames: [
      'Alexa.Presentation.APL.UserEvent'
    ]
  }

  const language = {
    statements: {
      aplcommand: {
        parser: `aplcommand
          = 'aplcommand' __ type:QuotedString {
            pushSay(location(), new lib.APLCommandParser(type));
          }
          / 'aplcommand' {
            pushSay(location(), new lib.APLCommandParser());
          }`
      },
      apl: {
        parser: `apl
          = 'apl' __ document:JsonFileName {
            pushSay(location(), new lib.APLParser(document));
          }
          / 'apl' __ document:VariableReference {
            pushSay(location(), new lib.APLParser(document));
          }
          / 'apl' {
            pushSay(location(), new lib.APLParser());
          }`
      }
    },
    testStatements: {},
    lib: {
      APLParser: aplParser(lib),
      APLCommandParser: aplCommandParser(lib)
    }
  }

  const runtime = {
    apiName: 'APL',
    source: aplHandler
  }

  return { compiler, language, runtime };
}
