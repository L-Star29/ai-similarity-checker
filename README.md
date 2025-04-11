# AI Similarity Checker for Teachers

An AI-powered web application that helps teachers grade assignments by analyzing semantic similarity between answer keys and student submissions.

## Features

- Upload and analyze answer keys and student submissions
- AI-powered semantic similarity analysis
- Configurable grading parameters
- Detailed feedback generation
- Visual highlighting of matched and missed concepts
- Dashboard with class performance analytics

## Tech Stack

- **Backend**: Python with FastAPI
- **Frontend**: React with TypeScript
- **UI Framework**: Material-UI
- **AI**: OpenAI GPT-4 API

## Prerequisites

- Python 3.8+
- Node.js 14+
- OpenAI API key

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-similarity-checker.git
cd ai-similarity-checker
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory:
```
OPENAI_API_KEY=your_api_key_here
```

4. Set up the frontend:
```bash
cd ../frontend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
uvicorn main:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Dashboard**: View overall statistics and recent submissions
2. **New Submission**: 
   - Upload an answer key document
   - Upload a student submission
   - Configure similarity threshold
   - Submit for analysis
3. **Results**: 
   - View similarity score and grade
   - See matched and missed concepts
   - Review detailed feedback

## API Documentation

The backend API documentation is available at `http://localhost:8000/docs` when the server is running.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 