/*
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */
import assert from 'assert';
import preamble from '../preamble';

describe('supports intent statements', function() {
  it('runs the intents integration test', function() {
    return preamble.runSkill('intents');
  });

  it('does not allow wrong indentation of intents', function() {
    preamble.expectParse(`waitForResponse
  say "hello"
  when AMAZON.YesIntent
    say "yes"

  when AMAZON.NoIntent
    say "no"
  say "post processor"`);
    preamble.expectFailParse(`waitForResponse
  when AMAZON.YesIntent
    say "hello"

    when AMAZON.NoIntent
      say "hi"`);

    preamble.expectFailParse(`waitForResponse
  say "howdy."

  when AMAZON.YesIntent
    say "hello"
    if 3 > 1
      when AMAZON.YesIntent
        say "meow"
      when AMAZON.NoIntent
        say "bork"`);
    preamble.expectFailParse(`waitForResponse
  say "howdy."

  when "nested level"
    say "hello"
    if 3 > 1
      if 4 > 3
        say "one more nested level"
        when "another level"
          say "meow"
        when AMAZON.NoIntent
          say "bork"`);
    preamble.expectFailParse(`someState
  when "hi"
    say "hi"
when "imposter state"
  say "hello"`);
  });
  it('does not allow duplicate intents that are not event/name-specific in the same state', function() {
    preamble.expectParse(`someState
  when "yes"
    say "wahoo"
  when AMAZON.NoIntent
    say "aww"

anotherState
  when "yes"
    or "yea"
    say "wahoo"
  when AMAZON.NoIntent
    say "aww"`);
    preamble.expectFailParse(`someState
  when "meow"
    or "mreow"
    say "meow meow"
  when AMAZON.NoIntent
    say "aww"
  when "Meow"
    say "meow meow"`, "redefine intent `MEOW`");
    preamble.expectFailParse(`waitForAnswer
  when "Yea"
    or "yes"
    say "You said"

  when AMAZON.NoIntent
    say "You said"

  when AMAZON.NoIntent
    say "no."`, "redefine intent `AMAZON.NoIntent`");
    preamble.expectParse(`global
  when AMAZON.StopIntent
    say "Goodbye."
    END

  when AMAZON.CancelIntent
    say "Bye."
    END

  when AMAZON.StartOverIntent
    say "No."
    END`);
    preamble.expectFailParse(`global
  when AMAZON.StopIntent
    say "Goodbye."
    END

  when AMAZON.CancelIntent
    say "Bye"

  when AMAZON.StartOverIntent
    say "No."
    END

  when AMAZON.CancelIntent
    say "bye."
    END`);
    preamble.expectFailParse(`global
  when AMAZON.YesIntent
    say "Goodbye."
    END

  when AMAZON.CancelIntent
    say "Bye"

  when AMAZON.StartOverIntent
    say "No."
    END

  when AMAZON.YesIntent
    say "bye."
    END`);
  });
  it('does allow multiple name-specific intents in the same state', function() {
    preamble.expectParse(`global
  when Connections.Response
    say "Connections.Response"

  when Connections.Response "Buy"
    say "upsell Connections.Response"

  when Connections.Response "Cancel"
    say "upsell Connections.Response"

  when Connections.Response "Upsell"
    say "upsell Connections.Response"

  when Connections.Response "Unknown"
    say "unknown Connections.Response"`);
  });
  it('does not allow plain utterances being reused in different intent handlers', function() {
    // when <utterance> + or <utterance>
    preamble.expectFailParse(`global
  when "walk"
    or "run"
    say "moving"

  when "run"
    say "running"`, "utterance 'run' in the intent handler for 'RUN' was already handled by the intent 'WALK'");
    // or <utterance> + or <utterance>
    preamble.expectFailParse(`global
  when "walk"
    or "run"
    say "moving"

  when "sprint"
    or "run"
    say "running"`, "utterance 'run' in the intent handler for 'SPRINT' was already handled by the intent 'WALK'");
    //  or <Utterance> + or <uTTERANCE>
    preamble.expectFailParse(`global
  when "walk"
    or "Run"
    say "moving"

  when "sprint"
    or "rUN"
    say "running"`, "utterance 'run' in the intent handler for 'SPRINT' was already handled by the intent 'WALK'");
  });
  it('does allow reusing otherwise identical utterances with different slot variables', function() {
    preamble.expectParse(`global
  when "wander"
    or "walk the $cheagle today"
    with $cheagle = "Coco"
    say "walking"

  when "stroll"
    or "walk the $poodle today"
    with $poodle = "Princess"
    say "running"`);
  });
  it('does not allow reusing identical utterances with identical slot variables', function() {
    preamble.expectFailParse(`global
  when "wander"
    or "walk the $Dog today"
    with $Dog = "Lassie"
    say "walking"

  when "stroll"
    or "walk the $Dog today"
    say "running"`, "utterance 'walk the $Dog today' in the intent handler for 'STROLL' was already handled by the intent 'WANDER'");
  });
  it('does not allow reusing intents when listed as parent handlers (multi-intent handlers)', function() {
    preamble.expectFailParse(`global
  when AMAZON.YesIntent
    say "hello"

  when AMAZON.YesIntent
    or AMAZON.NextIntent
    say "hi"`, "Not allowed to redefine intent `AMAZON.YesIntent` in state `global`");
  });
  it('does not allow reusing intents when aggregated with another handler (multi-intent handlers)', function() {
    preamble.expectFailParse(`global
  when AMAZON.YesIntent
    say "hello"

  when AMAZON.NextIntent
    or AMAZON.YesIntent
    say "hi"`, "Not allowed to redefine intent `AMAZON.YesIntent` in state `global`");
  });
  it('does not allow parenting itself (multi-intent handlers)', function() {
    preamble.expectFailParse(`global
  when AMAZON.YesIntent
    or AMAZON.YesIntent
    say "hi"`, "Not allowed to redefine intent `AMAZON.YesIntent` in state `global`");
  });
  it('does not allow reusing intents when it is aggregated with 2 different handlers (multi-intent handlers)', function() {
    preamble.expectFailParse(`global
  when AMAZON.YesIntent
    or AMAZON.HelpIntent
    say "hello"

  when AMAZON.NoIntent
    or AMAZON.HelpIntent
    say "hi"`, "Not allowed to redefine intent `AMAZON.HelpIntent` in state `global`");
  });
  it('does not allow declaring utterances in multi-intent handlers', function() {
    preamble.expectFailParse(`global
  when AMAZON.YesIntent
    or AMAZON.HelpIntent
    or "hello intent"
    say "hello"`, "Can't add utterance as an `or` alternative to `AMAZON.YesIntent` because it already has intent name alternatives");
  });
  it('does not allow creating multi-intent handlers if utterances exist', function() {
    preamble.expectFailParse(`global
  when AMAZON.YesIntent
    or "hello intent"
    or AMAZON.HelpIntent
    say "hello"`, "Can't add intent name `AMAZON.HelpIntent` as an `or` alternative to `AMAZON.YesIntent` because it already has utterance alternatives");
  });
  it('allows separately declaring utterances in other states and utterances for when handlers (multi-intent handlers)', function() {
    preamble.expectParse(`stateA
  when HelloIntent
    or "hello there"

  when MEOW
    or "meow meow"

  when AMAZON.RepeatIntent
    or AMAZON.NextIntent

global
  when HelloIntent
    or AMAZON.NoIntent

  when "meow"
    or AMAZON.YesIntent

  when AMAZON.RepeatIntent
    or "rephrase that"`);
  });
  it('creates a skill model that includes child intents of multi-intent handlers', async function() {
    const model = await preamble.buildSkillModel('intents');
    const intents = model.languageModel.intents.map((intent) => {
      return intent.name;
    });
    assert(intents.indexOf("PreviouslyNotDefinedIntentName") >= 0, 'PreviouslyNotDefinedIntentName exists in model');
    assert(intents.indexOf("AMAZON.NoIntent") >= 0, 'AMAZON.NoIntent exists in model');
    assert(intents.indexOf("OtherIntentName") >= 0, 'OtherIntentName exists in model');
  });
});