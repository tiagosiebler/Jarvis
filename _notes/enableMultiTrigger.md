# Allowing multiple triggers to fire if they all match
Default: if one trigger fires, no others will fire.
Desired: if more than one match is found, all triggers should fire.

Will be added to GA botkit, but isn't live yet:
https://github.com/jonchurch/botkit/blob/172d53677a881cddabaf1fb38d6237edcbbf6e9f/lib/CoreBot.js#L1013

See: https://github.com/howdyai/botkit/pull/934#issuecomment-449136983

## Logic to enable this in `node_modules/botkit/lib/CoreBot.js`:
```
        for (var e = 0; e < events.length; e++) {
            (function(keywords, test_function) {
                botkit.on(events[e], function(bot, message) {
                    if (test_function && test_function(keywords, message)) {
                        botkit.debug('I HEARD', keywords);
                        let triggerContinue = false;
                        botkit.middleware.heard.run(bot, message, function(err, bot, message) {
                            triggerContinue = cb.apply(this, [bot, message]);
                            botkit.trigger('heard_trigger', [bot, keywords, message]);
                        });
                        return triggerContinue;
                    }
                }, true);
            })(keywords, test_function);
        }

```