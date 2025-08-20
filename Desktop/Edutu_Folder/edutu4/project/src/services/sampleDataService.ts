import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const sampleOpportunities = [
  {
    title: "Full Scholarship to University of Oxford",
    summary: "Complete tuition coverage plus living expenses for international students pursuing undergraduate degrees at one of the world's top universities.",
    provider: "University of Oxford",
    deadline: "March 15, 2025",
    requirements: "Minimum 3.8 GPA, strong leadership experience, community service record",
    benefits: "Full tuition, accommodation, monthly stipend of £1,200, travel allowance",
    applicationProcess: "Online application, academic transcripts, personal statement, two recommendation letters",
    link: "https://www.ox.ac.uk/scholarships",
    successRate: "15%",
    eligibility: "International students, undergraduate level, demonstrated financial need",
    category: "Education",
    location: "Oxford, United Kingdom",
    tags: ["scholarship", "university", "international", "full-funding"],
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop&q=80&auto=format"
  },
  {
    title: "Google Software Engineer Internship 2025",
    summary: "12-week paid internship program for software engineering students with mentorship from Google engineers and real project experience.",
    provider: "Google",
    deadline: "February 1, 2025",
    requirements: "Computer Science student, strong programming skills in Python/Java/C++, minimum sophomore year",
    benefits: "$8,000 monthly stipend, housing assistance, mentorship program, full-time job opportunity",
    applicationProcess: "Online application, coding challenge, technical interviews, final interview",
    link: "https://careers.google.com/internships",
    successRate: "5%",
    eligibility: "Computer Science students, sophomore year or above, strong academic record",
    category: "Technology",
    location: "Mountain View, CA",
    tags: ["internship", "software", "tech", "paid"],
    imageUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600&h=300&fit=crop&q=80&auto=format"
  },
  {
    title: "Gates Foundation Global Health Fellowship",
    summary: "One-year fellowship focused on global health initiatives, working with leading organizations to improve health outcomes worldwide.",
    provider: "Bill & Melinda Gates Foundation",
    deadline: "January 31, 2025",
    requirements: "Graduate degree in public health, medicine, or related field, 2+ years experience, passion for global health",
    benefits: "$75,000 annual stipend, health insurance, professional development opportunities, travel expenses",
    applicationProcess: "Online application, CV, statement of purpose, three references, interview process",
    link: "https://www.gatesfoundation.org/careers/fellowships",
    successRate: "8%",
    eligibility: "Graduate degree holders, minimum 2 years relevant experience, commitment to global health",
    category: "Healthcare",
    location: "Seattle, WA / Global",
    tags: ["fellowship", "global-health", "nonprofit", "development"],
    imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=600&h=300&fit=crop&q=80&auto=format"
  },
  {
    title: "Y Combinator Startup Accelerator",
    summary: "3-month intensive startup program providing funding, mentorship, and access to a powerful network of entrepreneurs and investors.",
    provider: "Y Combinator",
    deadline: "Rolling applications",
    requirements: "Working prototype or clear product vision, strong founding team, scalable business model",
    benefits: "$250,000 funding, 3-month intensive program, mentor network, demo day presentation",
    applicationProcess: "Online application, video pitch, partner interviews, final selection",
    link: "https://www.ycombinator.com/apply",
    successRate: "3%",
    eligibility: "Early-stage startups, founding teams, innovative product or service concept",
    category: "Entrepreneurship",
    location: "San Francisco, CA",
    tags: ["startup", "accelerator", "funding", "entrepreneurship"],
    imageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=300&fit=crop&q=80&auto=format"
  },
  {
    title: "UN Youth Climate Summit Delegate Program",
    summary: "Opportunity to represent your country at the UN Youth Climate Summit, participate in policy discussions, and develop climate solutions.",
    provider: "United Nations",
    deadline: "April 30, 2025",
    requirements: "Age 18-29, demonstrated climate activism, strong communication skills, leadership experience",
    benefits: "Travel and accommodation covered, networking opportunities, certificate of participation, policy impact",
    applicationProcess: "National nomination process, application review, selection by UN youth office",
    link: "https://www.un.org/youth/climate-summit",
    successRate: "12%",
    eligibility: "Youth aged 18-29, citizenship verification, climate advocacy experience",
    category: "Environment",
    location: "New York, NY",
    tags: ["climate", "youth", "policy", "international"],
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=300&fit=crop&q=80&auto=format"
  },
  {
    title: "NASA USRP Research Internship",
    summary: "Hands-on research experience with NASA scientists and engineers, working on cutting-edge space technology and exploration projects.",
    provider: "NASA",
    deadline: "March 1, 2025",
    requirements: "STEM undergraduate/graduate student, minimum 3.0 GPA, U.S. citizenship, relevant coursework",
    benefits: "$7,000 monthly stipend, mentorship from NASA scientists, research publication opportunities",
    applicationProcess: "Online application through USRP portal, transcripts, personal statement, faculty recommendation",
    link: "https://intern.nasa.gov",
    successRate: "20%",
    eligibility: "U.S. citizens, STEM students, undergraduate or graduate level",
    category: "Science",
    location: "Various NASA Centers",
    tags: ["research", "space", "STEM", "internship"],
    imageUrl: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&h=300&fit=crop&q=80&auto=format"
  }
];

export const initializeSampleData = async (): Promise<boolean> => {
  try {
    console.log('🔄 Checking for existing opportunities data...');
    
    // Check if we already have data
    const existingQuery = query(collection(db, 'scholarships'), limit(1));
    const existingDocs = await getDocs(existingQuery);
    
    if (!existingDocs.empty) {
      console.log('✅ Opportunities data already exists, skipping initialization');
      return true;
    }
    
    console.log('📝 No data found, adding sample opportunities...');
    
    // Add sample data
    const promises = sampleOpportunities.map(async (opportunity) => {
      return addDoc(collection(db, 'scholarships'), {
        ...opportunity,
        createdAt: new Date(),
        publishedDate: new Date()
      });
    });
    
    await Promise.all(promises);
    console.log(`✅ Successfully added ${sampleOpportunities.length} sample opportunities`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize sample data:', error);
    return false;
  }
};

export const checkOpportunitiesConnection = async (): Promise<{
  connected: boolean;
  count: number;
  error?: string;
}> => {
  try {
    const q = query(collection(db, 'scholarships'), limit(5));
    const snapshot = await getDocs(q);
    
    return {
      connected: true,
      count: snapshot.size
    };
  } catch (error) {
    return {
      connected: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};