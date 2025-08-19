const { db } = require('../config/firebase');

const COLLECTION_NAME = 'opportunities';

class OpportunitiesService {
  async getAllOpportunities(limit = 50, filters = {}) {
    try {
      let query = db.collection(COLLECTION_NAME).orderBy('createdAt', 'desc');
      
      // Apply filters if provided
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      if (filters.difficulty) {
        query = query.where('difficultyLevel', '==', filters.difficulty);
      }
      if (filters.location && filters.location !== 'Various') {
        query = query.where('location', '==', filters.location);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      const opportunities = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Map Firestore data to frontend expected format
        opportunities.push({
          id: doc.id,
          title: data.title || 'Untitled Opportunity',
          organization: data.organization || 'Unknown',
          category: data.category || 'General',
          deadline: data.applicationDeadline || 'Not specified',
          location: data.location || 'Various',
          description: data.description || '',
          requirements: data.requirements || [],
          benefits: data.benefits || [],
          applicationProcess: data.applicationProcess || [],
          image: data.image || '', // RSS feeds typically don't have images
          match: data.matchScore || 0, // Will be calculated with AI personalization
          difficulty: data.difficultyLevel || 'Medium',
          applicants: data.applicantCount || 'N/A',
          successRate: data.successRate || 'N/A',
          skills: data.skills || [],
          salary: data.salary || undefined,
          // Additional fields from RSS scraper
          link: data.link || '',
          provider: data.provider || '',
          tags: data.tags || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      
      return opportunities;
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      throw new Error('Failed to fetch opportunities');
    }
  }

  async getOpportunityById(id) {
    try {
      const doc = await db.collection(COLLECTION_NAME).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      
      // Map Firestore data to frontend expected format
      return {
        id: doc.id,
        title: data.title || 'Untitled Opportunity',
        organization: data.organization || 'Unknown',
        category: data.category || 'General',
        deadline: data.applicationDeadline || 'Not specified',
        location: data.location || 'Various',
        description: data.description || '',
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        applicationProcess: data.applicationProcess || [],
        image: data.image || '',
        match: data.matchScore || 0,
        difficulty: data.difficultyLevel || 'Medium',
        applicants: data.applicantCount || 'N/A',
        successRate: data.successRate || 'N/A',
        skills: data.skills || [],
        salary: data.salary || undefined,
        link: data.link || '',
        provider: data.provider || '',
        tags: data.tags || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      console.error('Error fetching opportunity by ID:', error);
      throw new Error('Failed to fetch opportunity');
    }
  }

  async searchOpportunities(searchTerm, limit = 20) {
    try {
      // Note: Firestore doesn't have full-text search, so this is a basic implementation
      // For production, consider using Algolia or Firebase Extensions for search
      const snapshot = await db.collection(COLLECTION_NAME)
        .orderBy('createdAt', 'desc')
        .limit(100) // Get more items to filter through
        .get();
      
      const allOpportunities = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        allOpportunities.push({
          id: doc.id,
          title: data.title || '',
          organization: data.organization || '',
          category: data.category || '',
          deadline: data.applicationDeadline || '',
          location: data.location || '',
          description: data.description || '',
          requirements: data.requirements || [],
          benefits: data.benefits || [],
          applicationProcess: data.applicationProcess || [],
          image: data.image || '',
          match: data.matchScore || 0,
          difficulty: data.difficultyLevel || 'Medium',
          applicants: data.applicantCount || 'N/A',
          successRate: data.successRate || 'N/A',
          skills: data.skills || [],
          salary: data.salary || undefined,
          link: data.link || '',
          provider: data.provider || '',
          tags: data.tags || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      
      // Client-side filtering (not ideal for large datasets)
      const searchLower = searchTerm.toLowerCase();
      const filtered = allOpportunities.filter(opp => 
        opp.title.toLowerCase().includes(searchLower) ||
        opp.organization.toLowerCase().includes(searchLower) ||
        opp.description.toLowerCase().includes(searchLower) ||
        opp.category.toLowerCase().includes(searchLower)
      );
      
      return filtered.slice(0, limit);
    } catch (error) {
      console.error('Error searching opportunities:', error);
      throw new Error('Failed to search opportunities');
    }
  }

  async getOpportunityCategories() {
    try {
      const snapshot = await db.collection(COLLECTION_NAME).get();
      
      const categories = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categories.add(data.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return ['Scholarship', 'Fellowship', 'Technology', 'Mixed'];
    }
  }

  async getOpportunityCounts() {
    try {
      const snapshot = await db.collection(COLLECTION_NAME).get();
      
      const counts = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'Other';
        counts[category] = (counts[category] || 0) + 1;
      });
      
      return counts;
    } catch (error) {
      console.error('Error fetching opportunity counts:', error);
      return {};
    }
  }

  async createOpportunity(opportunityData) {
    try {
      const timestamp = new Date();
      const dataWithTimestamp = {
        ...opportunityData,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      const docRef = await db.collection(COLLECTION_NAME).add(dataWithTimestamp);
      
      return {
        id: docRef.id,
        ...dataWithTimestamp
      };
    } catch (error) {
      console.error('Error creating opportunity:', error);
      throw new Error('Failed to create opportunity');
    }
  }

  async updateOpportunity(id, updateData) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      const dataWithTimestamp = {
        ...updateData,
        updatedAt: new Date()
      };
      
      await docRef.update(dataWithTimestamp);
      
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();
      
      return {
        id: updatedDoc.id,
        title: data.title || 'Untitled Opportunity',
        organization: data.organization || 'Unknown',
        category: data.category || 'General',
        deadline: data.applicationDeadline || 'Not specified',
        location: data.location || 'Various',
        description: data.description || '',
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        applicationProcess: data.applicationProcess || [],
        image: data.image || '',
        match: data.matchScore || 0,
        difficulty: data.difficultyLevel || 'Medium',
        applicants: data.applicantCount || 'N/A',
        successRate: data.successRate || 'N/A',
        skills: data.skills || [],
        salary: data.salary || undefined,
        link: data.link || '',
        provider: data.provider || '',
        tags: data.tags || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      console.error('Error updating opportunity:', error);
      throw new Error('Failed to update opportunity');
    }
  }

  async deleteOpportunity(id) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return false;
      }
      
      await docRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      throw new Error('Failed to delete opportunity');
    }
  }
}

module.exports = new OpportunitiesService();