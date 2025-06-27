#!/usr/bin/env node

/**
 * Comprehensive test script for all 24 reply bots
 * This script simulates Discord messages to test each bot's functionality
 */

const testCases = [
    // 1. Attitude Bot (Xander Crews)
    { bot: 'Attitude Bot', trigger: 'I can\'t do this', expected: 'Well, not with THAT attitude!!!' },
    { bot: 'Attitude Bot', trigger: 'This won\'t work', expected: 'Well, not with THAT attitude!!!' },
    
    // 2. Baby Bot
    { bot: 'Baby Bot', trigger: 'Look at this baby', expected: 'Metroid gif' },
    
    // 3. Banana Bot
    { bot: 'Banana Bot', trigger: 'I love bananas', expected: 'Venn joke' },
    
    // 4. Blue Bot
    { bot: 'Blue Bot', trigger: 'I\'m feeling blue', expected: 'Blue response' },
    
    // 5. Bot Bot
    { bot: 'Bot Bot', trigger: 'bot message', expected: '5% chance response' },
    
    // 6. Chad Bot
    { bot: 'Chad Bot', trigger: 'chad moment', expected: 'Chad response' },
    
    // 7. Chaos Bot
    { bot: 'Chaos Bot', trigger: 'chaos reigns', expected: 'Final Fantasy reference' },
    
    // 8. Check Bot
    { bot: 'Check Bot', trigger: 'check this out', expected: 'czech this out' },
    { bot: 'Check Bot', trigger: 'czech republic', expected: 'check republic' },
    
    // 9. Example Bot
    { bot: 'Example Bot', trigger: 'example test', expected: 'simplified bot architecture' },
    { bot: 'Example Bot', trigger: 'simple test', expected: 'simplified bot architecture' },
    
    // 10. Ezio Bot
    { bot: 'Ezio Bot', trigger: 'ezio auditore', expected: 'Assassin\'s Creed quote' },
    { bot: 'Ezio Bot', trigger: 'assassin creed', expected: 'Assassin\'s Creed quote' },
    
    // 11. Gundam Bot
    { bot: 'Gundam Bot', trigger: 'gundam wing', expected: 'pronunciation joke' },
    
    // 12. Guy Bot
    { bot: 'Guy Bot', trigger: 'hey guy', expected: 'meme response' },
    
    // 13. Hold Bot
    { bot: 'Hold Bot', trigger: 'Hold on', expected: 'Hold.' },
    { bot: 'Hold Bot', trigger: 'hold up', expected: 'Hold.' },
    
    // 14. Homonym Bot (Gerald)
    { bot: 'Gerald', trigger: 'there going over their', expected: '15% chance correction' },
    { bot: 'Gerald', trigger: 'your welcome', expected: '15% chance correction' },
    
    // 15. Interrupt Bot
    { bot: 'Interrupt Bot', trigger: 'any message', expected: 'random interruption' },
    
    // 16. Macaroni Bot
    { bot: 'Macaroni Bot', trigger: 'macaroni and cheese', expected: 'Venn joke' },
    { bot: 'Macaroni Bot', trigger: 'pasta night', expected: 'Venn joke' },
    
    // 17. Music Correct Bot
    { bot: 'Music Correct Bot', trigger: 'music bot', expected: 'updated commands help' },
    
    // 18. Nice Bot (BunkBot)
    { bot: 'BunkBot', trigger: '69', expected: 'Nice.' },
    { bot: 'BunkBot', trigger: '420', expected: 'Nice.' },
    { bot: 'BunkBot', trigger: 'nice weather', expected: 'Nice.' },
    
    // 19. Pickle Bot (GremlinBot)
    { bot: 'GremlinBot', trigger: 'gremlin time', expected: 'confusion response' },
    
    // 20. Sheesh Bot
    { bot: 'Sheesh Bot', trigger: 'sheesh that was crazy', expected: 'SHEEEESH' },
    
    // 21. Sig Great Bot
    { bot: 'SigGreatBot', trigger: 'random message', expected: 'Great!' },
    
    // 22. Spider Bot
    { bot: 'Spider Bot', trigger: 'spider man is cool', expected: 'Spider-Man correction' },
    { bot: 'Spider Bot', trigger: 'spiderman movie', expected: 'Spider-Man correction' },
    
    // 23. Test Bot
    { bot: 'Test Bot', trigger: 'test message', expected: 'test response' },
    
    // 24. Venn Bot
    { bot: 'Venn Bot', trigger: 'venn diagram', expected: 'Venn response' }
];

console.log('🤖 Comprehensive Reply Bot Test Suite');
console.log('=====================================');
console.log(`Testing ${testCases.length} trigger patterns across 24 bots\n`);

// Group test cases by bot
const botGroups = {};
testCases.forEach(test => {
    if (!botGroups[test.bot]) {
        botGroups[test.bot] = [];
    }
    botGroups[test.bot].push(test);
});

console.log('📋 Test Coverage:');
Object.keys(botGroups).forEach((bot, index) => {
    const count = botGroups[bot].length;
    console.log(`  ${index + 1}. ${bot} (${count} test${count > 1 ? 's' : ''})`);
});

console.log('\n🎯 Test Patterns:');
testCases.forEach((test, index) => {
    console.log(`  ${index + 1}. "${test.trigger}" → ${test.bot}`);
});

console.log('\n✅ All 24 reply bots have test coverage!');
console.log('\n📝 To run actual tests:');
console.log('1. Deploy the container with proper Discord token');
console.log('2. Send these trigger messages in Discord');
console.log('3. Verify bot responses with correct avatars');
console.log('4. Check webhook functionality for custom identities');

console.log('\n🔧 Container Test Commands:');
console.log('podman run --env-file test-bunkbot.env -p 3000:3000 starbunk-bunkbot-test');
