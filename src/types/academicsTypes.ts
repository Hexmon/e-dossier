// Add these types to your academics API file or types file

export interface TheoryMarks {
    grade?: string;
    tutorial?: string;
    finalMarks?: number;
    phaseTest1Marks?: number;
    phaseTest2Marks?: number;
    sessionalMarks?: number;
    totalMarks?: number;
}

export interface PracticalMarks {
    grade?: string;
    tutorial?: string;
    finalMarks?: number;
    totalMarks?: number;
}

export interface SubjectWithMarks {
    offeringId: string;
    includeTheory: boolean;
    includePractical: boolean;
    theoryCredits: number;
    practicalCredits: number;
    subject: {
        id: string;
        code: string;
        name: string;
        branch: string;
        hasTheory: boolean;
        hasPractical: boolean;
        defaultTheoryCredits: number;
        defaultPracticalCredits: number;
        description: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    };
    theory?: TheoryMarks;
    practical?: PracticalMarks;
}

export interface SemesterData {
    semester: number;
    branchTag: string;
    sgpa?: number;
    cgpa?: number;
    marksScored?: number;
    subjects: SubjectWithMarks[];
    createdAt: string;
    updatedAt: string;
}

// Use this in your useAcademics hook
export interface SemesterGPAUpdate {
    marksScored?: number;
}

export interface SubjectMarks {
    theory?: {
        phaseTest1Marks?: number;
        phaseTest2Marks?: number;
        tutorial?: string;
        finalMarks?: number;
        grade?: string;
    };
    practical?: {
        finalMarks?: number;
        grade?: string;
        tutorial?: string;
    };
}
