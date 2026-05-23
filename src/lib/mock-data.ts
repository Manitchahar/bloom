export interface ContentItem {
  id: number;
  title: string;
  type: "blog" | "linkedin" | "ad" | "email";
  date: string;
  excerpt: string;
  color: "sage" | "lavender" | "terracotta";
}

export const mockHistory: ContentItem[] = [
  { id: 1, title: "10 Ways to Live More Sustainably", type: "blog", date: "2 hours ago", excerpt: "Discover simple yet impactful changes you can make in your daily routine to reduce your environmental footprint...", color: "sage" },
  { id: 2, title: "Product Launch Announcement", type: "linkedin", date: "Yesterday", excerpt: "Excited to announce our newest innovation in eco-friendly packaging. After months of research...", color: "lavender" },
  { id: 3, title: "Spring Sale Campaign", type: "ad", date: "2 days ago", excerpt: "Fresh starts deserve fresh styles. 30% off all sustainable fashion this weekend only.", color: "terracotta" },
  { id: 4, title: "Monthly Wellness Digest", type: "email", date: "3 days ago", excerpt: "Dear reader, this month we're exploring the connection between mindfulness and productivity...", color: "sage" },
  { id: 5, title: "Remote Work Culture Guide", type: "blog", date: "4 days ago", excerpt: "Building authentic connections in a distributed team requires intentionality and creative approaches...", color: "lavender" },
  { id: 6, title: "Year-End Reflection Post", type: "linkedin", date: "5 days ago", excerpt: "What a year it's been. From launching our sustainability initiative to growing our team by 40%...", color: "terracotta" },
  { id: 7, title: "Holiday Gift Guide", type: "email", date: "1 week ago", excerpt: "Thoughtful, sustainable gifts for the conscious consumer in your life...", color: "sage" },
  { id: 8, title: "Brand Awareness Campaign", type: "ad", date: "1 week ago", excerpt: "Nature doesn't rush, yet everything is accomplished. Neither do we. Crafted with patience.", color: "lavender" },
  { id: 9, title: "Team Building Ideas", type: "blog", date: "2 weeks ago", excerpt: "Forget trust falls. Here are 12 genuinely effective ways to build bonds in your team...", color: "terracotta" },
];

export const mockGeneratedContent: Record<string, string> = {
  blog: `The Art of Sustainable Living: A Beginner's Guide

In a world that moves faster each day, the call to slow down and live more consciously has never been stronger. Sustainable living isn't about perfection - it's about progress, one mindful choice at a time.

Start Small, Dream Big

The journey toward sustainability begins with awareness. Notice where your food comes from, how your clothes are made, and what happens to your waste. These observations plant the seeds of change.

Three Pillars to Build On:

1. Reduce what you consume - Ask "do I need this?" before every purchase
2. Reuse what you have - Creativity transforms old into gold
3. Reconnect with nature - Spend time outdoors to remember why this matters

The beauty of sustainable living is that it often simplifies life rather than complicating it. Less stuff means less stress. Local food tastes better. Walking instead of driving clears the mind.

Remember: every small action is a seed planted for future generations.`,

  linkedin: `I've been thinking a lot about what "sustainability" really means in business.

It's not just about recycling bins in the office or going paperless (though those help).

True sustainability is about building systems that can last. Teams that don't burn out. Products that solve real problems. Growth that doesn't come at someone else's expense.

Here's what I've learned after 3 years of building a sustainability-first company:

-> Profit and purpose aren't opposing forces
-> Your team's wellbeing IS your competitive advantage
-> Customers can tell when you mean it vs. when you're marketing it
-> The "slower" path often gets you further, faster

What does sustainability mean in YOUR work? I'd love to hear your perspective.`,

  ad: `Nature doesn't rush.
Yet everything blooms in its own time.

Your content deserves the same patience - crafted with care, designed with purpose, delivered with impact.

Bloom: AI-powered content that grows with you.

Start your free trial today.`,

  email: `Subject: This Month's Fresh Picks

Dear creative soul,

Spring has arrived, and with it, a fresh wave of inspiration for your content strategy.

This month, we're exploring:

- The "less is more" approach to social media that's actually working in 2024
- How storytelling transforms bland brand content into something people actually want to read
- A 15-minute content planning ritual that will save you hours each week

Plus, we've added three new content templates to your Bloom workspace - designed specifically for the mindful marketer who values quality over quantity.

Your content garden is looking beautiful this season. Keep nurturing it.

With warmth,
The Bloom Team`,
};

export const mockImprovements: Record<string, { text: string; explanation: string }> = {
  shorter: { text: "Condensed for maximum impact while retaining key messages.", explanation: "We trimmed redundancy and tightened sentence structure, reducing word count by about 40% without losing your core message." },
  persuasive: { text: "Reframed with stronger calls-to-action and emotional hooks.", explanation: "We added urgency, social proof language, and a clear CTA to drive the reader toward action." },
  formal: { text: "Elevated to professional register with precise vocabulary.", explanation: "We replaced casual phrases with formal equivalents and restructured sentences for a more authoritative tone." },
  seo: { text: "Optimized with keyword integration and structured formatting.", explanation: "We wove target keywords naturally into headers and body text, improved readability score, and added semantic structure." },
  audience: { text: "Adapted tone and references for the new target demographic.", explanation: "We adjusted the tone, references, and examples to resonate with a different demographic while preserving your authentic voice." },
};
