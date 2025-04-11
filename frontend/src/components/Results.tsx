import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { CheckCircle, Cancel, ExpandMore } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';

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

const Results = () => {
  const location = useLocation();
  const results = location.state as AnalysisResult;

  if (!results) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analysis Results for {results.student_name}
      </Typography>

      <Grid container spacing={3}>
        {/* Score Overview */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'background.default'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Similarity Score
            </Typography>
            <Typography variant="h2" color="primary">
              {(results.similarity_score * 100).toFixed(1)}%
            </Typography>
            <Chip
              label={`Grade: ${results.grade}`}
              color="primary"
              sx={{ mt: 2 }}
            />
          </Paper>
        </Grid>

        {/* Concept Analysis */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Concept Analysis
              </Typography>
              {/* Status Message */}
              {(() => {
                const totalConcepts = results.highlighted_matches.matched_concepts.length + results.highlighted_matches.missed_concepts.length;
                const matchedCount = results.highlighted_matches.matched_concepts.length;
                const matchPercentage = Math.round((matchedCount / totalConcepts) * 100);

                if (matchedCount > results.highlighted_matches.missed_concepts.length) {
                  return (
                    <Typography variant="subtitle1" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <CheckCircle fontSize="small" />
                      Majority of concepts matched
                    </Typography>
                  );
                } else {
                  return (
                    <Typography variant="subtitle1" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Cancel fontSize="small" />
                      Most concepts need improvement
                    </Typography>
                  );
                }
              })()}

              {/* Always show both sections in collapsible accordions */}
              <Accordion defaultExpanded={results.highlighted_matches.matched_concepts.length > 0}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle fontSize="small" color="success" />
                    Matched Concepts ({results.highlighted_matches.matched_concepts.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {results.highlighted_matches.matched_concepts.length > 0 ? (
                      results.highlighted_matches.matched_concepts.map((concept, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={concept} />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText primary="No concepts matched" sx={{ color: 'text.secondary' }} />
                      </ListItem>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded={results.highlighted_matches.missed_concepts.length > 0}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Cancel fontSize="small" color="error" />
                    Missing Concepts ({results.highlighted_matches.missed_concepts.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {results.highlighted_matches.missed_concepts.length > 0 ? (
                      results.highlighted_matches.missed_concepts.map((concept, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={concept} />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem>
                        <ListItemText primary="No missing concepts" sx={{ color: 'text.secondary' }} />
                      </ListItem>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>

        {/* Feedback */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Feedback
              </Typography>
              <List>
                {results.feedback.map((feedback, index) => (
                  <ListItem key={index} divider={index < results.feedback.length - 1}>
                    <ListItemText primary={feedback} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Results; 