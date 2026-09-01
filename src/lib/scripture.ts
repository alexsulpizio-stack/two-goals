import { dayOfYear } from "./dates";

export type Verse = {
  reference: string;
  text: string;
  theme: "eternity" | "abide" | "steward";
};

export const verses: Verse[] = [
  {
    reference: "John 17:3",
    theme: "eternity",
    text: "This is eternal life, that they should know you, the only true God, and him whom you sent, Jesus Christ.",
  },
  {
    reference: "John 3:16",
    theme: "eternity",
    text: "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
  },
  {
    reference: "John 14:6",
    theme: "eternity",
    text: "Jesus said to him, “I am the way, the truth, and the life. No one comes to the Father, except through me.”",
  },
  {
    reference: "John 11:25–26",
    theme: "eternity",
    text: "Jesus said to her, “I am the resurrection and the life. He who believes in me will still live, even if he dies. Whoever lives and believes in me will never die. Do you believe this?”",
  },
  {
    reference: "John 10:27–28",
    theme: "eternity",
    text: "My sheep hear my voice, and I know them, and they follow me. I give eternal life to them. They will never perish, and no one will snatch them out of my hand.",
  },
  {
    reference: "Romans 6:23",
    theme: "eternity",
    text: "For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord.",
  },
  {
    reference: "Ephesians 2:8–9",
    theme: "eternity",
    text: "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, that no one would boast.",
  },
  {
    reference: "1 John 5:11–12",
    theme: "eternity",
    text: "The testimony is this, that God gave to us eternal life, and this life is in his Son. He who has the Son has the life. He who doesn’t have God’s Son doesn’t have the life.",
  },
  {
    reference: "Romans 8:38–39",
    theme: "eternity",
    text: "For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers, nor height, nor depth, nor any other created thing will be able to separate us from God’s love which is in Christ Jesus our Lord.",
  },
  {
    reference: "1 Peter 1:3–4",
    theme: "eternity",
    text: "Blessed be the God and Father of our Lord Jesus Christ, who according to his great mercy caused us to be born again to a living hope through the resurrection of Jesus Christ from the dead, to an incorruptible and undefiled inheritance that doesn’t fade away, reserved in Heaven for you.",
  },
  {
    reference: "Revelation 21:3–4",
    theme: "eternity",
    text: "Behold, God’s dwelling is with people, and he will dwell with them, and they will be his people, and God himself will be with them as their God. He will wipe away every tear from their eyes. Death will be no more.",
  },
  {
    reference: "Philippians 1:21",
    theme: "eternity",
    text: "For to me to live is Christ, and to die is gain.",
  },
  {
    reference: "John 15:4–5",
    theme: "abide",
    text: "Remain in me, and I in you. As the branch can’t bear fruit by itself unless it remains in the vine, so neither can you, unless you remain in me. I am the vine. You are the branches.",
  },
  {
    reference: "Matthew 11:28–29",
    theme: "abide",
    text: "Come to me, all you who labor and are heavily burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart; and you will find rest for your souls.",
  },
  {
    reference: "Galatians 2:20",
    theme: "abide",
    text: "I have been crucified with Christ, and it is no longer I who live, but Christ lives in me. That life which I now live in the flesh, I live by faith in the Son of God, who loved me, and gave himself up for me.",
  },
  {
    reference: "Colossians 3:1–2",
    theme: "abide",
    text: "If then you were raised together with Christ, seek the things that are above, where Christ is, seated on the right hand of God. Set your mind on the things that are above, not on the things that are on the earth.",
  },
  {
    reference: "Hebrews 12:1–2",
    theme: "abide",
    text: "Let’s run with perseverance the race that is set before us, looking to Jesus, the author and perfecter of faith, who for the joy that was set before him endured the cross.",
  },
  {
    reference: "Psalm 16:11",
    theme: "abide",
    text: "You will show me the path of life. In your presence is fullness of joy. In your right hand there are pleasures forever more.",
  },
  {
    reference: "Psalm 23:1–3",
    theme: "abide",
    text: "The Lord is my shepherd; I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.",
  },
  {
    reference: "Proverbs 3:5–6",
    theme: "abide",
    text: "Trust in the Lord with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
  },
  {
    reference: "Micah 6:8",
    theme: "abide",
    text: "He has shown you, O man, what is good. What does the Lord require of you, but to act justly, to love mercy, and to walk humbly with your God?",
  },
  {
    reference: "Romans 12:1–2",
    theme: "abide",
    text: "Present your bodies a living sacrifice, holy, acceptable to God, which is your spiritual service. Don’t be conformed to this world, but be transformed by the renewing of your mind.",
  },
  {
    reference: "Matthew 6:33",
    theme: "steward",
    text: "But seek first God’s Kingdom and his righteousness; and all these things will be given to you as well.",
  },
  {
    reference: "Matthew 6:19–21",
    theme: "steward",
    text: "Don’t lay up treasures for yourselves on the earth, where moth and rust consume, and where thieves break through and steal; but lay up for yourselves treasures in heaven. For where your treasure is, there your heart will be also.",
  },
  {
    reference: "1 Timothy 6:6–8",
    theme: "steward",
    text: "But godliness with contentment is great gain. For we brought nothing into the world, and we certainly can’t carry anything out. But having food and clothing, we will be content with that.",
  },
  {
    reference: "1 Timothy 6:17–19",
    theme: "steward",
    text: "Charge those who are rich in this present world that they not be arrogant, nor have their hope set on the uncertainty of riches, but on the living God, who richly provides us with everything to enjoy. That they do good, that they be rich in good works, that they be ready to distribute, willing to share.",
  },
  {
    reference: "Luke 12:15",
    theme: "steward",
    text: "He said to them, “Beware! Keep yourselves from covetousness, for a man’s life doesn’t consist of the abundance of the things which he possesses.”",
  },
  {
    reference: "Luke 16:10",
    theme: "steward",
    text: "He who is faithful in a very little is faithful also in much. He who is dishonest in a very little is also dishonest in much.",
  },
  {
    reference: "Hebrews 13:5",
    theme: "steward",
    text: "Be free from the love of money, content with such things as you have, for he has said, “I will in no way leave you, neither will I in any way forsake you.”",
  },
  {
    reference: "Proverbs 21:20",
    theme: "steward",
    text: "There is precious treasure and oil in the dwelling of the wise, but a foolish man swallows it up.",
  },
  {
    reference: "Proverbs 13:11",
    theme: "steward",
    text: "Wealth gained dishonestly dwindles away, but he who gathers by hand makes it grow.",
  },
  {
    reference: "Deuteronomy 8:18",
    theme: "steward",
    text: "But you shall remember the Lord your God, for it is he who gives you power to get wealth, that he may establish his covenant which he swore to your fathers.",
  },
  {
    reference: "Ecclesiastes 5:10",
    theme: "steward",
    text: "He who loves silver shall not be satisfied with silver, nor he who loves abundance, with increase. This also is vanity.",
  },
  {
    reference: "Psalm 90:12",
    theme: "abide",
    text: "So teach us to count our days, that we may gain a heart of wisdom.",
  },
  {
    reference: "2 Timothy 4:7–8",
    theme: "eternity",
    text: "I have fought the good fight. I have finished the course. I have kept the faith. From now on, the crown of righteousness is stored up for me, which the Lord, the righteous judge, will give to me on that day.",
  },
  {
    reference: "Joshua 1:9",
    theme: "abide",
    text: "Haven’t I commanded you? Be strong and courageous. Don’t be afraid. Don’t be dismayed, for the Lord your God is with you wherever you go.",
  },
];

export function verseOfTheDay(date = new Date()): Verse {
  const index = (dayOfYear(date) - 1) % verses.length;
  return verses[index] ?? verses[0];
}
