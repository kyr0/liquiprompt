import { plan, runWorkflow } from "../src"
import { readFileSync } from "node:fs"
import prettyjson from "prettyjson"

// Read the horoscope template
const horoscopePrompt = readFileSync("data/prompt-templates/graph/horoscope/horoscope.liquid", "utf-8")

// Custom tags for the plan phase
const customTags = {
  // Mock tag to inject test data
  mock: async (tagName, ctx, input, opts, instance) => {
    console.log('Mocking for prompt:', ctx.prompt)
    const controlFlowResult = "CONTROL_FLOW_RESULT";
    
    switch (ctx.prompt) {
      case "generate_horoscope":
        // Generate a short horoscope to trigger the extension
        ctx.output = {
          ...ctx.output,
          [controlFlowResult]: `
# Horoscope for ${input.zodiac_sign}

## General outlook for the week
This week brings a mix of challenges and opportunities for ${input.zodiac_sign}. The stars are aligning to support your personal growth.

## Love and relationships
Communication is key this week. Express your feelings openly with loved ones.

## Career and finances
A new opportunity may arise. Stay alert and be ready to act quickly.

## Health and wellness
Focus on getting enough rest and staying hydrated.

## Personal growth
This is a good time for self-reflection and planning your next steps.
          `
        }
        break;

      case "extend_horoscope":
        // Generate an extended horoscope that's still too short
        ctx.output = {
          ...ctx.output,
          [controlFlowResult]: ctx.input.prev_generation_text + `

### Additional insights for ${input.zodiac_sign}
As a ${input.zodiac_sign}, you have unique strengths that will help you this week. Your natural determination will serve you well when facing obstacles. In relationships, your loyalty is your greatest asset.

The planetary alignment suggests favorable energy for financial decisions, but proceed with caution and do your research first. When it comes to health, paying attention to your intuition about your body's needs will be particularly important.
          `
        }
        break;

      case "final_polish":
        // Generate the final polished horoscope
        ctx.output = {
          ...ctx.output,
          [controlFlowResult]: `
# ${input.zodiac_sign} Weekly Horoscope: Your Path to Success

## General outlook for the week
This week shines brightly for you, dear ${input.zodiac_sign}! The cosmic energies are perfectly aligned to support your endeavors and personal growth. Venus and Jupiter create a harmonious aspect in your chart, bringing a wave of positive energy that will help you overcome any challenges that may arise.

## Love and relationships
Your romantic life receives a significant boost this week. If you're in a relationship, expect deeper connections and meaningful conversations that strengthen your bond. Single ${input.zodiac_sign}s might encounter someone special through a social gathering or mutual friend. The key is to be authentic and open-hearted in all your interactions.

Your friendships also benefit from this energy. A long-standing misunderstanding could finally be resolved, bringing renewed closeness with someone important to you.

## Career and finances
Professional opportunities abound! Your natural leadership qualities are heightened, making this an excellent time for presentations, job interviews, or pitching new ideas. A senior colleague or mentor may offer valuable advice—listen carefully.

Financially, the stars support careful investments and planning. Consider consulting a financial advisor before making significant decisions, but know that the timing is favorable for growth.

## Health and wellness
Your energy levels are strong, but balance is essential. Incorporate both vigorous exercise and mindful relaxation into your routine. Pay special attention to your digestive system—hydration and fiber-rich foods will serve you well.

Mental wellness deserves focus too. Meditation or journaling can help you process emotions and maintain clarity during busy moments.

## Personal growth
This is a powerful week for self-development, dear ${input.zodiac_sign}. Your natural determination and resilience will help you break through old patterns that no longer serve you. Consider what habits or beliefs are holding you back and take concrete steps to transform them.

The planetary alignment suggests this is an ideal time for learning something new—perhaps a language, skill, or area of study you've been curious about. Your absorption and retention are enhanced now.

## Making the most of opportunities
When challenges arise (and they will, as part of your growth), approach them with confidence. Your ${input.zodiac_sign} persistence is your superpower—use it wisely rather than forcing outcomes.

For building stronger connections, practice active listening rather than just waiting for your turn to speak. The subtle difference will transform your relationships in surprising ways.

The favorable planetary alignments particularly support creative endeavors and group projects. Don't hesitate to take the lead where your expertise is relevant.

Your natural ${input.zodiac_sign} strengths of [specific trait 1] and [specific trait 2] will be especially valuable this week. Lean into these qualities while remaining aware of potential blind spots like [potential challenge].

Remember, dear ${input.zodiac_sign}, the stars may guide you, but you create your own destiny through your choices. Embrace the opportunities of this week with openness and intention!
          `
        }
        break;
    }
    
    return "";
  }
};

// Function to run the example
async function runHoroscopeExample() {
  console.log("=== HOROSCOPE WORKFLOW EXAMPLE ===\n")
  
  // Input values
  const inputValues = {
    zodiac_sign: "Taurus",
    min_chars: 2000
  };
  
  console.log(`Generating horoscope for ${inputValues.zodiac_sign}...\n`)
  
  // Plan the prompt
  const planResult = await plan(horoscopePrompt, inputValues, { 
    tags: customTags 
  });
  
  console.log("=== PLAN RESULT ===")
  console.log(prettyjson.render(planResult.prompts.map(p => ({
    name: p.name,
    instruction: p.instruction,
    output: p.output
  }))));
  
  // Prepare prompts with mock data for simulation
  const promptsWithMockData = planResult.prompts.map(prompt => {
    switch(prompt.name) {
      case "generate_horoscope":
        if (prompt.instruction === "PROMPT") {
          return {
            ...prompt,
            output: {
              ...prompt.output,
              CONTROL_FLOW_RESULT: `
# Horoscope for ${inputValues.zodiac_sign}

## General outlook for the week
This week brings a mix of challenges and opportunities for ${inputValues.zodiac_sign}. The stars are aligning to support your personal growth.

## Love and relationships
Communication is key this week. Express your feelings openly with loved ones.

## Career and finances
A new opportunity may arise. Stay alert and be ready to act quickly.

## Health and wellness
Focus on getting enough rest and staying hydrated.

## Personal growth
This is a good time for self-reflection and planning your next steps.
              `
            }
          };
        } else if (prompt.instruction === "AFTER") {
          // Set GOTO for the AFTER step
          return {
            ...prompt,
            output: {
              ...prompt.output,
              CONTROL_FLOW_GOTO: "extend_horoscope"
            }
          };
        }
        break;
        
      case "extend_horoscope":
        if (prompt.instruction === "PROMPT") {
          return {
            ...prompt,
            output: {
              ...prompt.output,
              CONTROL_FLOW_RESULT: `
# ${inputValues.zodiac_sign} Weekly Horoscope

## General outlook for the week
This week brings a mix of challenges and opportunities for ${inputValues.zodiac_sign}. The stars are aligning to support your personal growth. You'll find yourself more motivated and energetic than usual.

## Love and relationships
Communication is key this week. Express your feelings openly with loved ones. If you're single, there's a potential for meeting someone interesting through mutual friends or social activities. For those in relationships, this is a good time to discuss future plans.

## Career and finances
A new opportunity may arise at work. Stay alert and be ready to act quickly. Your financial situation looks stable, but avoid unnecessary expenses. Consider setting aside some savings for future goals.

## Health and wellness
Focus on getting enough rest and staying hydrated. Your energy levels might fluctuate, so listen to your body and don't push yourself too hard. A balanced diet will help maintain your stamina.

## Personal growth
This is a good time for self-reflection and planning your next steps. Consider learning a new skill or taking up a hobby that challenges you mentally.

### Additional insights for ${inputValues.zodiac_sign}
As a ${inputValues.zodiac_sign}, you have unique strengths that will help you this week. Your natural determination will serve you well when facing obstacles. In relationships, your loyalty is your greatest asset.

The planetary alignment suggests favorable energy for financial decisions, but proceed with caution and do your research first. When it comes to health, paying attention to your intuition about your body's needs will be particularly important.
              `
            }
          };
        } else if (prompt.instruction === "AFTER") {
          // Set GOTO for the AFTER step
          return {
            ...prompt,
            output: {
              ...prompt.output,
              CONTROL_FLOW_GOTO: "final_polish"
            }
          };
        }
        break;
        
      case "final_polish":
        if (prompt.instruction === "PROMPT") {
          return {
            ...prompt,
            output: {
              ...prompt.output,
              CONTROL_FLOW_RESULT: `
# ${inputValues.zodiac_sign} Weekly Horoscope: Your Path to Success

## General outlook for the week
This week shines brightly for you, dear ${inputValues.zodiac_sign}! The cosmic energies are perfectly aligned to support your endeavors and personal growth. Venus and Jupiter create a harmonious aspect in your chart, bringing a wave of positive energy that will help you overcome any challenges that may arise.

## Love and relationships
Your romantic life receives a significant boost this week. If you're in a relationship, expect deeper connections and meaningful conversations that strengthen your bond. Single ${inputValues.zodiac_sign}s might encounter someone special through a social gathering or mutual friend. The key is to be authentic and open-hearted in all your interactions.

Your friendships also benefit from this energy. A long-standing misunderstanding could finally be resolved, bringing renewed closeness with someone important to you.

## Career and finances
Professional opportunities abound! Your natural leadership qualities are heightened, making this an excellent time for presentations, job interviews, or pitching new ideas. A senior colleague or mentor may offer valuable advice—listen carefully.

Financially, the stars support careful investments and planning. Consider consulting a financial advisor before making significant decisions, but know that the timing is favorable for growth.

## Health and wellness
Your energy levels are strong, but balance is essential. Incorporate both vigorous exercise and mindful relaxation into your routine. Pay special attention to your digestive system—hydration and fiber-rich foods will serve you well.

Mental wellness deserves focus too. Meditation or journaling can help you process emotions and maintain clarity during busy moments.

## Personal growth
This is a powerful week for self-development, dear ${inputValues.zodiac_sign}. Your natural determination and resilience will help you break through old patterns that no longer serve you. Consider what habits or beliefs are holding you back and take concrete steps to transform them.

The planetary alignment suggests this is an ideal time for learning something new—perhaps a language, skill, or area of study you've been curious about. Your absorption and retention are enhanced now.

## Making the most of opportunities
When challenges arise (and they will, as part of your growth), approach them with confidence. Your ${inputValues.zodiac_sign} persistence is your superpower—use it wisely rather than forcing outcomes.

For building stronger connections, practice active listening rather than just waiting for your turn to speak. The subtle difference will transform your relationships in surprising ways.

The favorable planetary alignments particularly support creative endeavors and group projects. Don't hesitate to take the lead where your expertise is relevant.

Your natural ${inputValues.zodiac_sign} strengths of patience and reliability will be especially valuable this week. Lean into these qualities while remaining aware of potential blind spots like stubbornness or resistance to change.

Remember, dear ${inputValues.zodiac_sign}, the stars may guide you, but you create your own destiny through your choices. Embrace the opportunities of this week with openness and intention!
              `
            }
          };
        } else if (prompt.instruction === "AFTER") {
          // Set DONE for the AFTER step
          return {
            ...prompt,
            output: {
              ...prompt.output,
              CONTROL_FLOW_DONE: true
            }
          };
        }
        break;
    }
    
    return prompt;
  });
  
  console.log("\n=== RUNNING WORKFLOW ===")
  
  // Execute the workflow
  const result = await runWorkflow(
    promptsWithMockData,
    inputValues,
    (eventType, data) => {
      if (eventType === "STEP_BEFORE") {
        console.log(`\n> Running step: ${data.step}...`);
      } else if (eventType === "STEP_RESULT_CHUNK") {
        console.log(`> Generated text: ${data.result.text.length} characters`);
      } else if (eventType === "WORKFLOW_DONE") {
        console.log(`\n> Workflow completed!`);
      }
    },
    "simulation" // Use simulation mode
  );
  
  // Display final result
  console.log("\n=== FINAL HOROSCOPE ===");
  console.log(result.CONTROL_FLOW_RESULT);
  
  console.log("\n=== FLOW SUMMARY ===");
  console.log(`Initial horoscope: Too short (< ${inputValues.min_chars} chars)`);
  console.log(`Extended horoscope: Still too short, needed final polish`);
  console.log(`Final horoscope: ${result.prev_generation_chars} characters`);
}

// Run the example
runHoroscopeExample();