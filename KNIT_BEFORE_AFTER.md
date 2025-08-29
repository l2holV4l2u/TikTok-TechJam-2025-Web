# Knit Visualizer - Before/After Dependency Analysis

This application now includes an enhanced **"Fix Dependencies"** feature that displays before/after dependency graphs with JSON toggle functionality.

## ✅ **New Features Implemented**

### **🔄 Before/After Visualization**

- **Before Graph**: Shows initial dependency structure from `fileToDefinedNodes`
- **After Graph**: Displays AI-analyzed results with suggested fixes
- **Side-by-side Layout**: Compare original vs. optimized dependency structure
- **Interactive Graphs**: Built with ReactFlow - zoom, pan, and explore both graphs

### **📊 JSON Toggle Feature**

- **Show JSON Checkbox**: Toggle to reveal raw JSON data
- **Before JSON Panel**: Collapsible display of input `fileToDefinedNodes` structure
- **After JSON Panel**: Collapsible display of complete API response
- **Pretty Formatting**: JSON is formatted with proper indentation for readability

### **🎨 Enhanced UI/UX**

- **Responsive Layout**: Stacks on mobile, side-by-side on larger screens
- **Color-Coded Graphs**: Before (blue theme), After (green theme)
- **Issue Highlighting**: Red edges for circular/problematic dependencies
- **Loading States**: Button shows "Analyzing..." during API calls
- **Error Handling**: Graceful error display for API failures

## 🎯 **Technical Implementation**

### **📡 API Integration**

- **Endpoint**: `POST /api/knit-fix`
- **Input**: `{ fileToDefinedNodes: Record<string, string[]> }`
- **Output**: `KnitFixResponse` with nodes, edges, suggestions
- **AI Analysis**: ChatGPT integration for dependency inference
- **Fallback Logic**: Local analysis when API unavailable

### **🔧 Graph Rendering**

- **Dynamic Import**: ReactFlow loaded only when needed (no SSR)
- **Edge Styling**:
  - Normal edges: Gray stroke
  - Circular dependencies: Red stroke + animation
  - Issue edges: Red stroke with issue labels
- **Node Layout**: Automatic positioning with grid-based placement

### **📱 Responsive Design**

- **Mobile**: Vertically stacked Before/After panels
- **Desktop**: Side-by-side layout with suggestions panel
- **JSON Panels**: Collapsible sections under each graph
- **Controls**: Top header with toggle and close button

## 📊 **Data Flow**

```typescript
// Input Format
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

// API Response Format
{
  "nodes": [{ "id": "...", "label": "..." }],
  "edges": [{ "source": "...", "target": "...", "issue": "circular" }],
  "suggestions": ["Remove circular dependencies...", "..."],
  "input": { /* original input echoed back */ }
}
```

## 🚀 **How to Use**

1. **Open Visualizer**: Click "Fix Dependencies" button in navigation
2. **View Before**: See initial dependency structure in left panel
3. **Analyze**: Click "Fix Dependencies" to run AI analysis
4. **Compare Results**: View optimized structure in right panel
5. **Review Suggestions**: Read AI-generated recommendations
6. **Toggle JSON**: Check "Show JSON" to see raw data structures
7. **Explore Graphs**: Use ReactFlow controls to pan, zoom, and inspect

## 🔧 **Technical Constraints Met**

- ✅ **Non-invasive**: Code only added between `// KNIT:START` and `// KNIT:END`
- ✅ **Preserved Existing**: All imports, layout, and styles remain unchanged
- ✅ **Dynamic Import**: ReactFlow loaded with `ssr: false`
- ✅ **TypeScript**: Strong typing with proper interfaces
- ✅ **Error Handling**: Graceful fallbacks for API failures
- ✅ **Responsive**: Works on all screen sizes with Tailwind CSS

## 🎨 **UI Components**

### **Controls Header**

- Fix Dependencies button (with loading state)
- Show JSON toggle checkbox
- Close modal button

### **Before Panel**

- "Before" title
- ReactFlow graph (blue theme)
- Collapsible JSON input display

### **After Panel**

- "After" title
- ReactFlow graph (green theme)
- Collapsible JSON response display

### **Suggestions Panel**

- Bulleted list of AI recommendations
- Empty state: "No suggestions yet"
- Scrollable content area

## 🔗 **Integration Points**

- **API Route**: `/api/knit-fix/route.ts` - Handles ChatGPT integration
- **Environment**: Uses `OPENAI_API_KEY` from `.env.local`
- **Dependencies**: `reactflow`, `@xyflow/react` already installed
- **Styling**: Inherits existing Tailwind CSS classes

The implementation provides a complete before/after dependency analysis tool with JSON debugging capabilities while maintaining the existing page structure and design.
