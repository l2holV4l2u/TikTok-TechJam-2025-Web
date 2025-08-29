# Knit Visualizer Feature

This application now includes a **"Fix Dependencies"** feature that analyzes Kotlin project dependencies using AI.

## How to Use

1. **Click "Fix Dependencies" button** in the top navigation
2. The system will analyze the sample Kotlin project structure
3. **AI Analysis**: Uses ChatGPT to infer dependency relationships and detect issues
4. **Graph Visualization**: Shows an interactive graph with:
   - **Nodes**: Classes/interfaces from your Kotlin files
   - **Edges**: Dependency relationships
   - **Red edges**: Circular or problematic dependencies
5. **Suggestions Panel**: Displays AI-generated recommendations to fix issues

## Features

- ✅ **AI-Powered Analysis**: Uses OpenAI GPT to analyze dependency structure
- ✅ **Interactive Graph**: Built with ReactFlow - zoom, pan, and explore
- ✅ **Issue Detection**: Automatically finds circular dependencies and architectural problems
- ✅ **Smart Suggestions**: Get specific recommendations to improve your code
- ✅ **Fallback Analysis**: Works even without OpenAI API key
- ✅ **Minimal Integration**: Added with `// KNIT:START` blocks, doesn't affect existing code

## Sample Data

The feature uses this data structure:

```json
{
  "fileToDefinedNodes": {
    "src/main/java/tiktok/knit/sample/Another.kt": [
      "tiktok.knit.sample.Another",
      "tiktok.knit.sample.IAnother",
      "tiktok.knit.sample.AA"
    ],
    "src/main/java/tiktok/knit/sample/MainActivity.kt": [
      "tiktok.knit.sample.MainActivity"
    ]
  }
}
```

## Technical Implementation

- **API Route**: `/api/knit-fix` (POST)
- **Frontend**: React with dynamic import of ReactFlow (SSR disabled)
- **AI Integration**: OpenAI GPT-3.5-turbo for dependency analysis
- **Styling**: Inherits existing Tailwind classes
- **Bundle Optimization**: ReactFlow is loaded only when needed

The implementation follows the constraint of only adding code between `// KNIT:START` and `// KNIT:END` blocks.
