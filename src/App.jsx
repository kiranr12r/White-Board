import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css'; // Optional: Add custom styles.

const socket = io('http://localhost:5000'); // Connect to the back-end server.

const colors = ['black', 'red', 'blue', 'green', 'yellow', 'purple'];
const brushes = [2, 4, 6, 8, 10]; // Brush sizes.

const App = () => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('black'); // Brush color.
  const [selectedBrush, setSelectedBrush] = useState(2); // Brush size.
  const [selectedShape, setSelectedShape] = useState('freehand'); // Shape: freehand, rectangle, circle, eraser.
  const [startPos, setStartPos] = useState(null); // For shape start position.
  const canvasRef = useRef(null);

  useEffect(() => {
    socket.on('notes', (data) => {
      setNotes(data);
    });

    socket.on('draw', ({ x0, y0, x1, y1, color, size }) => {
      const context = canvasRef.current.getContext('2d');
      context.strokeStyle = color;
      context.lineWidth = size;
      drawLine(context, x0, y0, x1, y1);
    });

    return () => {
      socket.off('notes');
      socket.off('draw');
    };
  }, []);

  const handleAddNote = () => {
    if (newNote) {
      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      setNewNote('');
      socket.emit('addNote', updatedNotes);
    }
  };

  const handleDraw = (e) => {
    if (!drawing || selectedShape !== 'freehand') return;

    const context = canvasRef.current.getContext('2d');
    const { offsetX, offsetY } = e.nativeEvent;

    if (selectedShape === 'eraser') {
      context.strokeStyle = 'white'; // Set stroke color to white for erasing.
    } else {
      context.strokeStyle = selectedColor;
    }
    context.lineWidth = selectedBrush;
    drawLine(context, context.lastX, context.lastY, offsetX, offsetY);
    
    socket.emit('draw', {
      x0: context.lastX,
      y0: context.lastY,
      x1: offsetX,
      y1: offsetY,
      color: context.strokeStyle,
      size: context.lineWidth,
    });
    context.lastX = offsetX;
    context.lastY = offsetY;
  };

  const handleMouseDown = (e) => {
    setDrawing(true);
    const context = canvasRef.current.getContext('2d');
    const { offsetX, offsetY } = e.nativeEvent;
    context.lastX = offsetX;
    context.lastY = offsetY;
    
    if (selectedShape !== 'freehand') {
      setStartPos({ x: offsetX, y: offsetY });
    }
  };

  const handleMouseUp = (e) => {
    if (selectedShape === 'rectangle' || selectedShape === 'circle') {
      const context = canvasRef.current.getContext('2d');
      const { offsetX, offsetY } = e.nativeEvent;

      if (selectedShape === 'rectangle') {
        drawRectangle(context, startPos.x, startPos.y, offsetX, offsetY);
      } else if (selectedShape === 'circle') {
        drawCircle(context, startPos.x, startPos.y, offsetX, offsetY);
      }
      setStartPos(null); // Reset start position after drawing the shape.
    }
    setDrawing(false);
  };

  const drawLine = (context, x0, y0, x1, y1) => {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.stroke();
    context.closePath();
  };

  const drawRectangle = (context, x0, y0, x1, y1) => {
    const width = x1 - x0;
    const height = y1 - y0;
    context.beginPath();
    context.rect(x0, y0, width, height);
    context.strokeStyle = selectedColor;
    context.lineWidth = selectedBrush;
    context.stroke();
    context.closePath();
  };

  const drawCircle = (context, x0, y0, x1, y1) => {
    const radius = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    context.beginPath();
    context.arc(x0, y0, radius, 0, 2 * Math.PI);
    context.strokeStyle = selectedColor;
    context.lineWidth = selectedBrush;
    context.stroke();
    context.closePath();
  };

  return (
    <div className="App flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">WhiteboardPro</h1>

      {/* Sticky Notes Section */}
      <div className="notes mb-8 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Sticky Notes</h2>
        <ul className="list-disc pl-5 mb-4 bg-white shadow-md p-4 rounded-lg">
          {notes.map((note, index) => (
            <li key={index} className="mb-2">{note}</li>
          ))}
        </ul>
        <div className="flex space-x-2">
          <input
            className="border p-2 flex-grow rounded-lg shadow-sm"
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a sticky note"
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600"
            onClick={handleAddNote}
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Brush, Color, and Shape Options */}
      <div className="flex items-center mb-8 w-full max-w-lg">
        <div className="mr-6">
          <label className="block text-sm font-medium mb-2">Brush Size</label>
          <select
            className="mt-1 block w-full p-2 border rounded-lg shadow-sm"
            value={selectedBrush}
            onChange={(e) => setSelectedBrush(parseInt(e.target.value))}
          >
            {brushes.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </div>

        <div className="mr-6">
          <label className="block text-sm font-medium mb-2">Brush Color</label>
          <div className="flex space-x-2 mt-1">
            {colors.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full ${color === selectedColor ? 'ring-2 ring-black' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Shapes</label>
          <select
            className="mt-1 block w-full p-2 border rounded-lg shadow-sm"
            value={selectedShape}
            onChange={(e) => setSelectedShape(e.target.value)}
          >
            <option value="freehand">Freehand</option>
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="eraser">Eraser</option>
          </select>
        </div>
      </div>

      {/* Whiteboard Section */}
      <div className="whiteboard w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Whiteboard</h2>
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleDraw}
          className="border border-black bg-white shadow-md rounded-lg"
        />
      </div>
    </div>
  );
};

export default App;
