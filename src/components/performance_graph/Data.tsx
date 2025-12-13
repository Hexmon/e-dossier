"use client";


const umang = "c96a98e6-7d2d-41f9-bb4b-6d4f1797ac5d";
const divyansh = "dc9a8ffb-9c41-450d-9bbd-080cbad47f04";
const shashank = "3f301c06-00f6-4f47-aef0-7142ebbbfb46";


export const umangData = {
    academics: [8.8,9.0,9.2,9.4,9.6,9.8] as number[],  
    olq: [125,140,160,180,235,280] as number[],          
    odt: [18,25,40,58,70,83] as number[],            
    discipline: [9.0,11,19,27,34,41] as number[]      
};


export const divyanshData = {
    academics: [7.0, 7.2, 9.0, 7.3, 8.9, 7.4] as number[], 
    olq: [170,190,210,180,175,220] as number[],            
    odt: [40,50,60,45,80,70] as number[],            
    discipline: [20,28,33,25,28,30] as number[]      
};


export const shashankData = {
    academics: [9.9,9.5,9,7,5,3] as number[],      
    olq: [295,265,160,140,120,90] as number[],            
    odt: [99,47,34,22,17,10] as number[],            
    discipline: [37,41,36,29,19,9] as number[]      
};



export const fallBack = (ocId: string) => {
    return {
        academics: [8.0, 8.2, 8.1, 8.3, 8.2, 8.4] as number[], 
        olq: [150, 160, 150, 140, 160, 170] as number[],            
        odt: [60, 50, 40, 50, 60, 65] as number[],            
        discipline: [28, 30, 32, 28, 26, 34] as number[]      
    };
};



export const data = (ocId: string) => {
    if (ocId === umang) { return umangData; }


    else if (ocId === divyansh) { return divyanshData; }


    else if (ocId === shashank) { return shashankData; }


    else { return fallBack(ocId); }


};


export const computeAverageMarks = (category: "academics" | "olq" | "odt" | "discipline") => {
    const umangValues = umangData[category];
    const divyanshValues = divyanshData[category];
    const shashankValues = shashankData[category];
    
    const averages: number[] = [];
    
    for (let i = 0; i < umangValues.length; i++) {
        const avg = (umangValues[i] + divyanshValues[i] + shashankValues[i]) / 3;
        averages.push(Math.round(avg * 10) / 10);
    }
    
    return averages;
};