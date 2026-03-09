export const formatAIResponseToMarkdown = (text) => {
  if (!text) return '';
  
  // If text already has markdown headers or bolding, it might be already formatted.
  // We'll still process single newlines to ensure proper spacing.
  
  let formatted = text;

  // 1. Convert known section titles to Markdown H3 if they aren't already
  const sections = [
    'Nutritional Breakdown', 'Alignment with Your Goals', 'Weight Loss Goal',
    'Key Insights', 'Caloric Overload', 'Nutrient Poor', 'Unhealthy Fat Profile',
    'Sodium Content', 'Healthier Alternatives', 'Dietary Restrictions',
    'Meals', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Directions', 'Ingredients',
    'Meal Plan'
  ];

  sections.forEach(section => {
    // Regex matches the section at the start of a line, optionally followed by a colon
    const regex = new RegExp(`^(${section})(?::\\s*)?$`, 'gim');
    formatted = formatted.replace(regex, '\n### $1\n');
  });

  // 2. Bold text that looks like "Label:" or "Feature:" at the start of a line
  // e.g. "Calories: 2500" -> "**Calories:** 2500"
  // Wait, the regex needs to be careful not to match URLs or time (like 12:00)
  formatted = formatted.replace(/^([A-Za-z0-9\s/]+):\s/gm, '**$1:** ');

  // 3. Ensure double newlines for paragraph spacing if they are single newlines
  // ReactMarkdown requires double newlines for breaks, or we can use remark-breaks
  // Actually, standardizing newlines is tough. Let's just normalize to double newlines 
  // where a line doesn't start with a bullet point.
  
  // Replace single newlines with double newlines, except when there are already multiple
  formatted = formatted.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');

  // 4. Clean up any excessive newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted;
};
