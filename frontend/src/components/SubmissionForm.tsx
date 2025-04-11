import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Slider,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

interface GradingConfig {
  similarity_threshold: number;
  grade_ranges: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
}

interface AnalysisResult {
  student_name: string;
  similarity_score: number;
  grade: string;
  feedback: string[];
  highlighted_matches: {
    matched_concepts: string[];
    missed_concepts: string[];
  };
}

const SubmissionForm = () => {
  const navigate = useNavigate();
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [studentSubmission, setStudentSubmission] = useState<File | null>(null);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(70);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!answerKey || !studentSubmission) {
      setError('Please upload both answer key and student submission');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('answer_key', answerKey);
    formData.append('student_submission', studentSubmission);
    
    const config: GradingConfig = {
      similarity_threshold: similarityThreshold / 100,
      grade_ranges: {
        A: 90,
        B: 80,
        C: 70,
        D: 60,
        F: 0,
      },
    };
    
    formData.append('config', JSON.stringify(config));

    try {
      console.log('Sending request to backend...');
      const response = await axios.post(API_ENDPOINTS.analyze, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });
      
      console.log('Response received:', response.data);
      
      // Format the response data
      const result: AnalysisResult = {
        student_name: studentSubmission.name,
        similarity_score: response.data.similarity_score,
        grade: response.data.grade,
        feedback: Array.isArray(response.data.feedback) 
          ? response.data.feedback 
          : [response.data.feedback].filter(Boolean),
        highlighted_matches: {
          matched_concepts: Array.isArray(response.data.highlighted_matches?.matched_concepts)
            ? response.data.highlighted_matches.matched_concepts
            : [],
          missed_concepts: Array.isArray(response.data.highlighted_matches?.missed_concepts)
            ? response.data.highlighted_matches.missed_concepts
            : []
        }
      };
      
      navigate('/results', { state: result });
    } catch (err) {
      console.error('Error during submission:', err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.detail || err.message || 'Error submitting files. Please try again.';
        setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        
        if (err.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again or check if the server is running.');
        } else if (!err.response) {
          setError('Cannot connect to the server. Please make sure the backend is running.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h4" gutterBottom>
        Submit Assignment
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Answer Key
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUpload />}
                fullWidth
                disabled={isLoading}
              >
                Upload Answer Key
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.rtf"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('Answer key selected:', file.name);
                      setAnswerKey(file);
                    }
                  }}
                />
              </Button>
              {answerKey && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {answerKey.name}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Student Submission
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUpload />}
                fullWidth
                disabled={isLoading}
              >
                Upload Submission
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.rtf"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log('Student submission selected:', file.name);
                      setStudentSubmission(file);
                    }
                  }}
                />
              </Button>
              {studentSubmission && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {studentSubmission.name}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>
                Similarity Threshold: {similarityThreshold}%
              </Typography>
              <Slider
                value={similarityThreshold}
                onChange={(_, value) => setSimilarityThreshold(value as number)}
                valueLabelDisplay="auto"
                step={5}
                marks
                min={0}
                max={100}
                disabled={isLoading}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        disabled={!answerKey || !studentSubmission || isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
      >
        {isLoading ? 'Analyzing...' : 'Analyze Submission'}
      </Button>
    </Box>
  );
};

export default SubmissionForm; 