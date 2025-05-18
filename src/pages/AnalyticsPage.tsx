import React from 'react';
import {
  Container,
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import NavigationBar from '../components/NavigationBar';

const topMetrics = [
  { id: 1, title: 'Total Revenue', value: '$45,231.89', change: '+20.1% from last month' },
  { id: 2, title: 'Subscriptions', value: '+2350', change: '+180.1% from last month' },
  { id: 3, title: 'Sales', value: '+12,234', change: '+19% from last month' },
  { id: 4, title: 'Active Now', value: '+573', change: '+201 since last hour' }
];

const recentSales = [
  { id: 1, name: 'Olivia Martin', email: 'olivia.martin@email.com', amount: '+$1,999.00' },
  { id: 2, name: 'Jackson Lee', email: 'jackson.lee@email.com', amount: '+$39.00' },
  { id: 3, name: 'Isabella Nguyen', email: 'isabella.nguyen@email.com', amount: '+$299.00' },
  { id: 4, name: 'William Kim', email: 'will@email.com', amount: '+$99.00' },
  { id: 5, name: 'Sofia Davis', email: 'sofia.davis@email.com', amount: '+$39.00' }
];

const AnalyticsPage: React.FC = () => {
  return (
    <Container maxWidth={false} disableGutters>
      <NavigationBar title="Analytics" />
      <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>

        {/* Top metrics cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {topMetrics.map(metric => (
            <Grid item xs={12} sm={6} md={3} key={metric.id}>
              <Paper sx={{ p: 3, backgroundColor: '#ffffff' }} elevation={1}>
                <Typography variant="subtitle2" color="textPrimary">
                  {metric.title}
                </Typography>
                <Typography variant="h5" color="textPrimary" sx={{ mt: 1 }}>
                  {metric.value}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {metric.change}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Main content: Overview chart and Recent Sales */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: '100%' }} elevation={1}>
              <Typography variant="h6" color="textPrimary">
                Overview
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  height: 300,
                  backgroundColor: '#e0e0e0',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body1" color="textSecondary">
                  Chart placeholder
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: '100%' }} elevation={1}>
              <Typography variant="h6" color="textPrimary">
                Recent Sales
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                You made 265 sales this month.
              </Typography>
              <List>
                {recentSales.map(item => (
                  <ListItem key={item.id} disableGutters>
                    <ListItemAvatar>
                      <Avatar>{item.name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={item.name} secondary={item.email} />
                    <ListItemSecondaryAction>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.amount}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>

      </Box>
    </Container>
  );
};

export default AnalyticsPage; 