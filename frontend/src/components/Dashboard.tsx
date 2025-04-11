import React from 'react';
import { Paper, Typography, Card, CardContent } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { styled } from '@mui/material/styles';

const Item = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

const Dashboard: React.FC = () => {
  // Mock data - in a real app, this would come from an API
  const stats = {
    totalSubmissions: 150,
    averageScore: 85,
    recentSubmissions: [
      { id: 1, student: "John Doe", grade: "A", date: "2024-01-15" },
      { id: 2, student: "Jane Smith", grade: "B", date: "2024-01-14" },
      { id: 3, student: "Mike Johnson", grade: "A-", date: "2024-01-13" },
    ],
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid xs={12} md={4}>
          <Item>
            <Typography variant="h6">Total Submissions</Typography>
            <Typography variant="h3" sx={{ mt: 2 }}>
              {stats.totalSubmissions}
            </Typography>
          </Item>
        </Grid>

        <Grid xs={12} md={4}>
          <Item>
            <Typography variant="h6">Average Score</Typography>
            <Typography variant="h3" sx={{ mt: 2 }}>
              {stats.averageScore}%
            </Typography>
          </Item>
        </Grid>

        <Grid xs={12} md={4}>
          <Item>
            <Typography variant="h6">Pass Rate</Typography>
            <Typography variant="h3" sx={{ mt: 2 }}>
              78%
            </Typography>
          </Item>
        </Grid>

        {/* Recent Submissions */}
        <Grid xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Submissions
              </Typography>
              {/* Add your submissions table or list here */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard; 