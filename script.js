const dropZone = document.getElementById('dropZone');
const svgCode = document.getElementById('svgCode');
const svgPreview = document.getElementById('svgPreview');
const fileInput = document.getElementById('fileInput');
const downloadBtn = document.getElementById('downloadBtn');
let originalSvgContent = '';
let convertedSvgContent = '';

// drag and drop events
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  processSVGFile(file);
});

// file input
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  processSVGFile(file);
});

// parsing the SVG file
function processSVGFile(file) {
  if (file && file.type === 'image/svg+xml') {
    const reader = new FileReader();
    reader.onload = function(event) {
      originalSvgContent = event.target.result;
      convertSVG(originalSvgContent);
    };
    reader.readAsText(file);
  } else if (file) {
    svgCode.textContent = 'Please upload a valid SVG file.';
    svgPreview.innerHTML = '';
    downloadBtn.disabled = true;
  }
}

// Convert SVG smooth points to angled points
function convertSVG(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    svgCode.textContent = 'Error parsing SVG: Invalid SVG format';
    svgPreview.innerHTML = '';
    downloadBtn.disabled = true;
    return;
  }
  
  // Find all paths
  const paths = doc.querySelectorAll('path');
  
  if (paths.length === 0) {
    svgCode.textContent = 'No curve paths found in the SVG file. Please upload an SVG file with curved points!';
    svgPreview.innerHTML = svgText;
    downloadBtn.disabled = true;
    return;
  }
  
  // Convert each path
  paths.forEach(path => {
    const d = path.getAttribute('d');
    if (d) {
      const newD = convertCurvesToAngles(d);
      path.setAttribute('d', newD);
    }
  });
  
  // Get the converted SVG as string
  convertedSvgContent = new XMLSerializer().serializeToString(doc);
  
  // Display the code
  svgCode.textContent = convertedSvgContent;
  
  // Display the SVG
  svgPreview.innerHTML = convertedSvgContent;
  
  // Enable download button
  downloadBtn.disabled = false;
}

// Convert curves in a path to angled points
function convertCurvesToAngles(d) {
  // Regular expression to match SVG path commands
  const commandsRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;
  let resultPath = '';
  let currentX = 0, currentY = 0;
  let firstX = 0, firstY = 0;
  
  // Process each command in the path
  while ((match = commandsRegex.exec(d)) !== null) {
    const command = match[1];
    const params = match[2].trim().split(/[\s,]+/).filter(p => p !== '').map(parseFloat);
    
    switch (command) {
      case 'M': // Absolute moveto
        if (params.length >= 2) {
          currentX = firstX = params[0];
          currentY = firstY = params[1];
          resultPath += `M ${currentX} ${currentY} `;
          
          // Handle multiple coordinate pairs
          for (let i = 2; i < params.length; i += 2) {
            if (i + 1 < params.length) {
              currentX = params[i];
              currentY = params[i + 1];
              resultPath += `L ${currentX} ${currentY} `;
            }
          }
        }
        break;
        
      case 'm': // Relative moveto
        if (params.length >= 2) {
          currentX = firstX = currentX + params[0];
          currentY = firstY = currentY + params[1];
          resultPath += `M ${currentX} ${currentY} `;
          
          // Handle multiple coordinate pairs
          for (let i = 2; i < params.length; i += 2) {
            if (i + 1 < params.length) {
              currentX += params[i];
              currentY += params[i + 1];
              resultPath += `L ${currentX} ${currentY} `;
            }
          }
        }
        break;
        
      case 'L': // Absolute lineto
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length) {
            currentX = params[i];
            currentY = params[i + 1];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'l': // Relative lineto
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length) {
            currentX += params[i];
            currentY += params[i + 1];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'H': // Absolute horizontal lineto
        for (let i = 0; i < params.length; i++) {
          currentX = params[i];
          resultPath += `L ${currentX} ${currentY} `;
        }
        break;
        
      case 'h': // Relative horizontal lineto
        for (let i = 0; i < params.length; i++) {
          currentX += params[i];
          resultPath += `L ${currentX} ${currentY} `;
        }
        break;
        
      case 'V': // Absolute vertical lineto
        for (let i = 0; i < params.length; i++) {
          currentY = params[i];
          resultPath += `L ${currentX} ${currentY} `;
        }
        break;
        
      case 'v': // Relative vertical lineto
        for (let i = 0; i < params.length; i++) {
          currentY += params[i];
          resultPath += `L ${currentX} ${currentY} `;
        }
        break;
        
      case 'C': // Absolute cubic Bézier curve
        for (let i = 0; i < params.length; i += 6) {
          if (i + 5 < params.length) {
            // Convert curve to straight line to end point
            currentX = params[i + 4];
            currentY = params[i + 5];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'c': // Relative cubic Bézier curve
        for (let i = 0; i < params.length; i += 6) {
          if (i + 5 < params.length) {
            // Convert curve to straight line to end point
            currentX += params[i + 4];
            currentY += params[i + 5];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'S': // Absolute smooth cubic Bézier curve
        for (let i = 0; i < params.length; i += 4) {
          if (i + 3 < params.length) {
            // Convert curve to straight line to end point
            currentX = params[i + 2];
            currentY = params[i + 3];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 's': // Relative smooth cubic Bézier curve
        for (let i = 0; i < params.length; i += 4) {
          if (i + 3 < params.length) {
            // Convert curve to straight line to end point
            currentX += params[i + 2];
            currentY += params[i + 3];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'Q': // Absolute quadratic Bézier curve
        for (let i = 0; i < params.length; i += 4) {
          if (i + 3 < params.length) {
            // Convert curve to straight line to end point
            currentX = params[i + 2];
            currentY = params[i + 3];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'q': // Relative quadratic Bézier curve
        for (let i = 0; i < params.length; i += 4) {
          if (i + 3 < params.length) {
            // Convert curve to straight line to end point
            currentX += params[i + 2];
            currentY += params[i + 3];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'T': // Absolute smooth quadratic Bézier curve
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length) {
            // Convert curve to straight line to end point
            currentX = params[i];
            currentY = params[i + 1];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 't': // Relative smooth quadratic Bézier curve
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length) {
            // Convert curve to straight line to end point
            currentX += params[i];
            currentY += params[i + 1];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'A': // Absolute elliptical arc
        for (let i = 0; i < params.length; i += 7) {
          if (i + 6 < params.length) {
            // Convert arc to straight line to end point
            currentX = params[i + 5];
            currentY = params[i + 6];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'a': // Relative elliptical arc
        for (let i = 0; i < params.length; i += 7) {
          if (i + 6 < params.length) {
            // Convert arc to straight line to end point
            currentX += params[i + 5];
            currentY += params[i + 6];
            resultPath += `L ${currentX} ${currentY} `;
          }
        }
        break;
        
      case 'Z': // Closepath
      case 'z':
        resultPath += 'Z ';
        currentX = firstX;
        currentY = firstY;
        break;
    }
  }
  
  return resultPath.trim();
}

// Download button functionality
downloadBtn.addEventListener('click', () => {
  const blob = new Blob([convertedSvgContent], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'converted-svg.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});