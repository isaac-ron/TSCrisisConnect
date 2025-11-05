// server/src/services/twitter-mock.js
// Mock Twitter feed for testing DisasterPulse NLP pipeline

const mockTweets = [
    // Earthquake tweets
    "Just felt a huge shake in downtown Los Angeles. Hope everyone is okay. #earthquake",
    "Building shaking violently in San Francisco. Is this an earthquake?",
    "Massive earthquake near San Diego, magnitude estimated at 6.5",
    
    // Fire tweets
    "Massive fire spreading fast near the Hollywood Hills. Seeing smoke from miles away. #LAfire",
    "The wildfire in Griffith Park is out of control. Evacuations ordered for nearby homes. #wildfire",
    "Apartment building on fire at 5th and Main Street. Firefighters on scene.",
    
    // Flood tweets
    "Flash flood warning for Santa Monica and Venice Beach areas. Streets are already rivers. #LAflood",
    "Hurricane-force winds and flooding in Miami Beach. Stay safe everyone!",
    "Severe flooding in Houston downtown area. Water rising fast.",
    
    // Vehicle crashes
    "Huge multi-car pile-up on the 405 freeway northbound near LAX. Multiple injuries reported.",
    "Train derailment near Chicago Union Station. Emergency services responding.",
    "Plane crash reported at Newark Airport. Prayers for everyone involved.",
    
    // Violence/shooting
    "Active shooter situation reported near the USC campus. Police advising shelter in place. #activeshooter",
    "Explosion at downtown Boston building. Multiple casualties reported.",
    "Bombing reported in Times Square. NYPD on scene. Stay away from the area.",
    
    // Tornado/Hurricane
    "Tornado warning issued for eastern LA county. This is not a drill. Take cover now!",
    "Category 4 hurricane approaching Florida coast. Mandatory evacuations in effect.",
    
    // Non-crisis tweets (should be filtered out)
    "Traffic is a disaster today, spent 2 hours on the highway!",
    "Just finished watching a great movie about natural disasters.",
    "My Monday morning coffee situation is a total crisis lol",
];

// Function to simulate fetching tweets from Twitter API
export function mockTwitterFeed() {
    // Return a random subset of tweets to simulate a live feed
    const tweetCount = Math.floor(Math.random() * 4) + 2; // 2 to 5 new tweets
    const shuffled = [...mockTweets].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, tweetCount).map((content, index) => ({
        id: `tweet_${Date.now()}_${index}`,
        text: content,
        url: `https://twitter.com/user/status/${Date.now()}${index}`,
        author: `@user${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString()
    }));
}
