export const DEMO_AI_CONTENT = [
  {
    _id: "demo-1",
    sourceMaterialTitle: "Introduction to Agentic AI Systems",
    mcqs: [
      {
        question: "What is the primary characteristic of an 'Agentic' AI system?",
        options: ["Simple pattern matching", "Ability to execute multi-step goals autonomously", "Higher processing speed", "Lack of memory"],
        choices: ["Simple pattern matching", "Ability to execute multi-step goals autonomously", "Higher processing speed", "Lack of memory"],
        correctAnswer: "Ability to execute multi-step goals autonomously",
        answer: "Ability to execute multi-step goals autonomously"
      },
      {
        question: "Which component is essential for an AI agent to improve over time?",
        options: ["More training data", "A feedback loop from the environment", "Static prompts", "Faster GPU"],
        choices: ["More training data", "A feedback loop from the environment", "Static prompts", "Faster GPU"],
        correctAnswer: "A feedback loop from the environment",
        answer: "A feedback loop from the environment"
      },
      {
        question: "Chain of Thought prompting is most useful for which of the following?",
        options: ["Generating random numbers", "Simple arithmetic", "Complex reasoning tasks", "Single word translations"],
        choices: ["Generating random numbers", "Simple arithmetic", "Complex reasoning tasks", "Single word translations"],
        correctAnswer: "Complex reasoning tasks",
        answer: "Complex reasoning tasks"
      },
      {
        question: "What distinguishes an AI agent from a standard Large Language Model (LLM)?",
        options: ["The LLM has more parameters", "The agent can interact with external tools and APIs", "The LLM is always newer", "Agents do not use LLMs"],
        choices: ["The LLM has more parameters", "The agent can interact with external tools and APIs", "The LLM is always newer", "Agents do not use LLMs"],
        correctAnswer: "The agent can interact with external tools and APIs",
        answer: "The agent can interact with external tools and APIs"
      }
    ],
    applicationProblem: {
      description: "Design an autonomous research agent that finds the latest news on a topic and summarizes it into a newsletter.",
      steps: ["Identify search keywords", "Filter reputable sources", "Synthesize information", "Format output"]
    },
    materials: [
      {
        title: "Defining Autonomy in AI",
        content: "Agentic AI refers to systems capable of setting goals and executing tasks with minimal human intervention. Unlike traditional software, these agents can reason about the best path to a solution."
      },
      {
        title: "The Reason-Act Loop",
        content: "The core architecture involves Perception, followed by Reasoning (LLM), taking an Action (Tool use), and receiving Feedback from the environment to adjust the next step."
      },
      {
        title: "Tools and Capabilities",
        content: "Agents leverage 'Tools'—functions or APIs—to interact with the world. This allows them to browse the web, run code, or manage databases beyond their internal knowledge base."
      },
      {
        title: "Safety and Governance",
        content: "Implementing guardrails is crucial. Agents must operate within defined constraints to prevent unintended actions, especially in production environments."
      }
    ]
  }
];
