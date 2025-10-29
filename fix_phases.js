const fs = require('fs');

// Read the file
const filePath = 'src/pages/Expenses.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the problematic line
const oldLine = '      const validation = validateCSVData(rows, projects, phases);';
const newCode = `      // Fetch all phases for validation
      const { data: allPhases } = await supabase
        .from("phases")
        .select("id, name, project_id, projects!inner(id, name)");
      
      const phasesForValidation = allPhases?.map((phase) => ({
        id: phase.id,
        name: phase.name,
        project_id: phase.project_id,
        project_name: phase.projects?.name || "No Project",
      })) || [];
      
      const validation = validateCSVData(rows, projects, phasesForValidation);`;

content = content.replace(oldLine, newCode);

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed the phase validation issue!');
