export type Scenario = {
  id: number;
  category: string;
  title: string;
  description: string;
  prompt: string;
  count: number;
  tag: string;
  trending?: boolean;
};

export const categories = [
  "All",
  "Deep",
  "Funny",
  "Relationships",
  "Future & Sci-Fi",
  "Moral Dilemmas",
  "Life",
  "Weird",
];

export const scenarios: Scenario[] = [
  {
    id: 1,
    category: "Future & Sci-Fi",
    title: "Meet your future self",
    description:
      "You wake up tomorrow and discover that you can meet your future self.",
    prompt: "What are the three questions you'd ask?",
    count: 1284,
    tag: "Deep",
    trending: true,
  },
  {
    id: 2,
    category: "Moral Dilemmas",
    title: "₦500 million, but there's a catch",
    description:
      "Someone offers you ₦500 million. You can take it, but you'll never speak to your closest friend again.",
    prompt: "Would you take the money? Why or why not?",
    count: 2041,
    tag: "Moral",
    trending: true,
  },
  {
    id: 3,
    category: "Chaos & Funny",
    title: "The duck problem",
    description:
      "Every time you lie, a duck appears within 10 metres. Nobody knows why.",
    prompt: "Would you stop lying or embrace the duck army?",
    count: 934,
    tag: "Funny",
  },
  {
    id: 4,
    category: "Life",
    title: "Know exactly how your life ends",
    description:
      "You can see exactly how your life will turn out, including your successes, failures and relationships.",
    prompt: "Would you look?",
    count: 1762,
    tag: "Deep",
    trending: true,
  },
  {
    id: 5,
    category: "Relationships",
    title: "Read one person's mind",
    description:
      "You can read the mind of one person you know for exactly 24 hours.",
    prompt: "Who would you choose?",
    count: 815,
    tag: "Relationships",
  },
  {
    id: 6,
    category: "Weird",
    title: "The mysterious button",
    description:
      "A button appears on your desk. Pressing it gives you ₦1 million, but you don't know what happens somewhere else.",
    prompt: "Are you pressing it?",
    count: 621,
    tag: "Weird",
  },
  {
    id: 7,
    category: "Future & Sci-Fi",
    title: "Pause the world",
    description:
      "You can freeze time for everyone except yourself, but you can only use the ability once.",
    prompt: "When would you use it?",
    count: 1430,
    tag: "Future",
  },
  {
    id: 8,
    category: "Life",
    title: "Delete one regret",
    description:
      "You can completely erase one regret from your past.",
    prompt: "What would you erase?",
    count: 1107,
    tag: "Life",
  },
];