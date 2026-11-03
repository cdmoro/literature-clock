#import <Foundation/Foundation.h>
#include <stdlib.h>

const char *LCCatchOptionsException(void (^block)(void)) {
    @try {
        block();
        return NULL;
    } @catch (NSException *exception) {
        NSString *message = [NSString stringWithFormat:@"%@\n%@", exception.name, exception.reason ?: @"Unknown exception"];
        return strdup(message.UTF8String);
    }
}
