export type CommunityAnswer = {
  id: number;
  name: string;
  answer: string;
  likes: number;
  unexpected?: boolean;
};

export const initialAnswers: CommunityAnswer[] = [
  {
    id: 1,
    name: "Maya",
    answer:
      "I'd ask whether I'm happy, whether I made the right choices, and what I should stop worrying about.",
    likes: 142,
    unexpected: true,
  },
  {
    id: 2,
    name: "Alex",
    answer:
      "I'd ask what happens to the people I love. I think knowing how they'll be doing would matter more to me than knowing my own future.",
    likes: 98,
  },
  {
    id: 3,
    name: "Jordan",
    answer:
      "I'd ask what my biggest mistake was, what my biggest achievement was, and whether I became the person I wanted to be.",
    likes: 76,
  },
  {
    id: 4,
    name: "Sam",
    answer:
      "I'd ask future me one thing: 'Are we okay?' Then I'd probably spend the remaining nine minutes trying to understand the answer.",
    likes: 64,
    unexpected: true,
  },
];