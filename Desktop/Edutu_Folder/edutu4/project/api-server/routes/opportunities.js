const express = require('express');
const router = express.Router();
const opportunitiesService = require('../services/opportunitiesService');
const { validateOpportunityData, sanitizeOpportunityData } = require('../utils/validation');

router.get('/', async (req, res) => {
  try {
    const opportunities = await opportunitiesService.getAllOpportunities();
    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length
    });
  } catch (error) {
    console.error('GET /opportunities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const opportunity = await opportunitiesService.getOpportunityById(id);
    
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }
    
    res.json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    console.error('GET /opportunities/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunity'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const sanitizedData = sanitizeOpportunityData(req.body);
    const validation = validateOpportunityData(sanitizedData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    const newOpportunity = await opportunitiesService.createOpportunity(sanitizedData);
    
    res.status(201).json({
      success: true,
      data: newOpportunity,
      message: 'Opportunity created successfully'
    });
  } catch (error) {
    console.error('POST /opportunities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create opportunity'
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedData = sanitizeOpportunityData(req.body);
    const validation = validateOpportunityData(sanitizedData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    const updatedOpportunity = await opportunitiesService.updateOpportunity(id, sanitizedData);
    
    if (!updatedOpportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedOpportunity,
      message: 'Opportunity updated successfully'
    });
  } catch (error) {
    console.error('PUT /opportunities/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update opportunity'
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await opportunitiesService.deleteOpportunity(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Opportunity deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /opportunities/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete opportunity'
    });
  }
});

module.exports = router;