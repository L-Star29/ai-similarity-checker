from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sentence_transformers import SentenceTransformer, util
import torch
import numpy as np
from dotenv import load_dotenv
import json
import PyPDF2
from io import BytesIO
from docx import Document

# Load environment variables (keeping this for future configuration)
load_dotenv()

# Initialize the sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')  # Small, fast model with good performance

app = FastAPI(title="AI Similarity Checker")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://l-star29.github.io",
        "https://l-star29.github.io/ai-similarity-checker",
        "https://*.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GradingConfig(BaseModel):
    similarity_threshold: float = 0.7
    grade_ranges: dict = {
        "A": 90,
        "B": 80,
        "C": 70,
        "D": 60,
        "F": 0
    }
    weights: Optional[dict] = None

class SubmissionResult(BaseModel):
    student_name: str
    similarity_score: float
    grade: str
    feedback: List[str]
    highlighted_matches: dict

def extract_key_points(text: str) -> List[str]:
    """Extract key points from text by splitting into meaningful sentences and concepts."""
    try:
        # Clean the text
        text = text.strip()
        if not text:
            return []

        # Basic text cleaning
        text = text.replace('\n', ' ')
        text = ' '.join(text.split())  # Remove extra whitespace

        # Handle common abbreviations to prevent incorrect splits
        common_abbrev = ['Mr.', 'Mrs.', 'Dr.', 'Ph.D.', 'e.g.', 'i.e.', 'etc.', 'vs.', 'fig.', 'eq.']
        for abbrev in common_abbrev:
            text = text.replace(abbrev, abbrev.replace('.', '@'))

        import re
        
        # First, try to find bullet points or numbered items
        bullet_pattern = r'(?:^|\n)(?:[-•*→]|\d+[\)\.])?\s*([^.\n]+(?:\.[^.\n]+)*)'
        bullet_points = re.findall(bullet_pattern, text)
        
        if bullet_points:
            key_points = bullet_points
        else:
            # If no bullet points found, split by sentences
            sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
            key_points = sentences

        # Clean and process points
        cleaned_points = []
        for point in key_points:
            # Restore abbreviations
            for abbrev in common_abbrev:
                point = point.replace(abbrev.replace('.', '@'), abbrev)
            
            # Clean the point
            point = point.strip()
            
            # Skip if too short or just numbers/special characters
            if len(point) < 10 or not re.search(r'[a-zA-Z]{3,}', point):
                continue
            
            # Remove leading numbers, bullets, etc.
            point = re.sub(r'^(?:\d+[\)\.]\s*|[-•*→]\s*)', '', point)
            
            # Add to key points if not already present and meaningful
            if point not in cleaned_points and len(point.split()) > 3:
                cleaned_points.append(point)

        return cleaned_points
    except Exception as e:
        print(f"Error in extract_key_points: {str(e)}")
        return [text]  # Return original text as a fallback

def get_concise_summary(text: str) -> str:
    """Extract a concise summary from a longer text."""
    # If it's a question, return everything before the answer
    if '?' in text:
        question_part = text.split('?')[0] + '?'
        return question_part if len(question_part) > 10 else text

    # If it contains a colon, take the part before it
    if ':' in text:
        return text.split(':')[0].strip()

    # For statements, try to get the main subject
    words = text.split()
    if len(words) > 8:
        return ' '.join(words[:8]) + '...'
    
    return text

def analyze_similarity(answer_key: str, student_answer: str, threshold: float = 0.7) -> tuple:
    """Analyze similarity between answer key and student answer using sentence transformers."""
    try:
        # Extract key points
        key_points = extract_key_points(answer_key)
        student_points = extract_key_points(student_answer)

        if not key_points or not student_points:
            raise ValueError("No valid text found in input")

        # Encode sentences
        key_embeddings = model.encode(key_points, convert_to_tensor=True)
        student_embeddings = model.encode(student_points, convert_to_tensor=True)

        # Calculate cosine similarity matrix
        similarity_matrix = util.pytorch_cos_sim(key_embeddings, student_embeddings)

        # Find matched and missed concepts with stricter criteria
        matched_concepts = []
        missed_concepts = []
        detailed_feedback = []
        concept_scores = []  # Store individual concept scores

        # Common factual terms that need exact matching
        import re
        def extract_key_terms(text):
            """Extract potentially important factual terms (names, dates, numbers, etc.)"""
            patterns = [
                r'\b\d{4}\b',  # Years
                r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',  # Proper nouns
                r'\b\d+(?:st|nd|rd|th)?\b',  # Numbers with ordinals
                r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b',  # Months
            ]
            terms = []
            for pattern in patterns:
                terms.extend(re.findall(pattern, text))
            return set(terms)

        for i, key_point in enumerate(key_points):
            best_match_score = torch.max(similarity_matrix[i]).item()
            best_match_idx = torch.argmax(similarity_matrix[i]).item()
            student_point = student_points[best_match_idx]
            
            # Extract key factual terms from both answer key and student response
            key_terms = extract_key_terms(key_point)
            student_terms = extract_key_terms(student_point)
            
            # Calculate term match ratio
            matching_terms = key_terms.intersection(student_terms)
            term_ratio = len(matching_terms) / len(key_terms) if key_terms else 1.0

            # Dynamic threshold based on content type
            base_threshold = threshold
            if key_terms:  # If there are factual terms, be more strict
                required_term_ratio = 0.7  # Require at least 70% of key terms to match
                dynamic_threshold = max(base_threshold, 0.75)  # Higher threshold for factual content
            else:
                required_term_ratio = 0.0  # No term matching required for conceptual answers
                dynamic_threshold = base_threshold

            # Determine if it's a match based on both semantic similarity and factual accuracy
            is_match = (best_match_score >= dynamic_threshold and 
                       (term_ratio >= required_term_ratio or not key_terms))

            # Calculate concept score considering both semantic and factual accuracy
            if key_terms:
                concept_score = min(best_match_score, term_ratio)  # Use the lower of the two scores
            else:
                concept_score = best_match_score
            
            concept_scores.append(concept_score)

            if key_point.lower() == student_point.lower():
                # Perfect match
                matched_concepts.append(key_point)
                detailed_feedback.append(f"✅ Perfect Match (100%):")
                detailed_feedback.append(f"   Expected: {key_point}")
                detailed_feedback.append(f"   Found: {student_point}")
            
            elif is_match:
                # Good semantic match with sufficient factual accuracy
                matched_concepts.append(key_point)
                match_percentage = round(concept_score * 100)
                detailed_feedback.append(f"✅ Concept Match ({match_percentage}%):")
                detailed_feedback.append(f"   Expected: {key_point}")
                detailed_feedback.append(f"   Found: {student_point}")
            
            else:
                # Not a match
                missed_concepts.append(key_point)
                match_percentage = round(concept_score * 100)
                detailed_feedback.append(f"❌ Incorrect ({match_percentage}%):")
                detailed_feedback.append(f"   Expected: {key_point}")
                
                if best_match_score > 0.5:  # Show related but incorrect attempt
                    if key_terms:
                        missing_terms = key_terms - student_terms
                        incorrect_terms = student_terms - key_terms
                        if missing_terms or incorrect_terms:
                            if missing_terms:
                                detailed_feedback.append(f"   Missing: {', '.join(missing_terms)}")
                            if incorrect_terms:
                                detailed_feedback.append(f"   Incorrect: {', '.join(incorrect_terms)}")
                        else:
                            detailed_feedback.append(f"   Found: {student_point}")

        # Calculate overall score as the average of individual concept scores
        overall_score = sum(concept_scores) / len(concept_scores)

        # Generate structured feedback
        feedback = []
        
        # Overall assessment
        overall_percentage = round(overall_score * 100, 1)
        if overall_score >= threshold:
            feedback.append(f"✨ Overall Score: {overall_percentage}% - Meets the required threshold of {round(threshold * 100)}%")
        else:
            feedback.append(f"📊 Overall Score: {overall_percentage}% - Below the required threshold of {round(threshold * 100)}%")

        feedback.append("\n💡 Detailed Analysis:")
        
        # Add appropriate header based on score
        if len(matched_concepts) == len(key_points) and all(s >= 0.95 for s in concept_scores):
            feedback.append("✨ Perfect Score! All concepts were correctly addressed.")
        elif len(missed_concepts) == len(key_points):
            feedback.append("❌ No concepts were correctly addressed.")
        
        # Add the detailed feedback
        feedback.extend(detailed_feedback)

        # Summary section
        feedback.append("\n📝 Summary:")
        feedback.append(f"• Matched Concepts: {len(matched_concepts)} out of {len(key_points)}")
        if missed_concepts:
            feedback.append("• Concepts Needing Improvement:")
            for concept in missed_concepts:
                feedback.append(f"  - {concept}")

        return overall_score, feedback, matched_concepts, missed_concepts

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def calculate_grade(similarity_score: float, config: GradingConfig) -> str:
    for grade, min_score in sorted(config.grade_ranges.items(), key=lambda x: x[1], reverse=True):
        if similarity_score * 100 >= min_score:
            return grade
    return "F"

async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text from various file formats."""
    content = await file.read()
    file_ext = file.filename.lower().split('.')[-1]
    
    try:
        if file_ext == 'txt':
            return content.decode()
        
        elif file_ext == 'pdf':
            pdf_reader = PyPDF2.PdfReader(BytesIO(content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        
        elif file_ext in ['doc', 'docx']:
            doc = Document(BytesIO(content))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: .{file_ext}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing {file.filename}: {str(e)}"
        )
    finally:
        await file.seek(0)

@app.post("/api/analyze")
async def analyze_submission(
    answer_key: UploadFile = File(...),
    student_submission: UploadFile = File(...),
    config: str = Form(...)
):
    try:
        # Parse the config JSON string
        config_data = json.loads(config)
        config_obj = GradingConfig(**config_data)

        # Extract text from files
        answer_key_text = await extract_text_from_file(answer_key)
        student_submission_text = await extract_text_from_file(student_submission)

        # Analyze similarity using the configured threshold
        similarity_score, feedback, matched_concepts, missed_concepts = analyze_similarity(
            answer_key_text, 
            student_submission_text,
            threshold=config_obj.similarity_threshold
        )

        # Calculate grade
        grade = calculate_grade(similarity_score, config_obj)

        # Create highlighted matches
        highlighted_matches = {
            "matched_concepts": matched_concepts,
            "missed_concepts": missed_concepts
        }

        return SubmissionResult(
            student_name=student_submission.filename,
            similarity_score=similarity_score,
            grade=grade,
            feedback=feedback,
            highlighted_matches=highlighted_matches
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 