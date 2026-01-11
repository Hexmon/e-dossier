import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import officerCadetFormReducer from './slices/officerCadetFormSlice';
import dossierFillingReducer from './slices/dossierFillingSlice';
import inspSheetReducer from './slices/inspSheetSlice';
import personalParticularsReducer from './slices/personalParticularsSlice';
import ssbReportReducer from './slices/ssbReportSlice';
import familyBackgroundReducer from './slices/familyBackgroundSlice';
import educationQualificationReducer from './slices/educationQualificationSlice';
import achievementsReducer from './slices/achievementsSlice';
import autobiographyReducer from './slices/autobiographySlice';
import medicalInfoReducer from './slices/medicalInfoSlice';
import medicalCategoryReducer from './slices/medicalCategorySlice';
import disciplineRecordsReducer from './slices/disciplineRecordsSlice';
import parentCommReducer from './slices/parentCommSlice';
import sportsAwardsReducer from './slices/sportsAwardsSlice';
import weaponTrainingReducer from './slices/weaponTrainingSlice';
import obstacleTrainingReducer from './slices/obstacleTrainingSlice';
import speedMarchReducer from './slices/speedMarchSlice';
import campReviewsReducer from './slices/campReviewsSlice';
import clubDrillReducer from './slices/clubDrillSlice';
import leaveRecordsReducer from './slices/leaveRecordsSlice';
import hikeRecordsReducer from './slices/hikeRecordsSlice';
import detentionRecordsReducer from './slices/detentionRecordsSlice';
import counsellingRecordsReducer from './slices/counsellingRecordsSlice';
import initialInterviewReducer from './slices/initialInterviewSlice';
import termInterviewReducer from './slices/termInterviewSlice';
import cfeRecordsReducer from './slices/cfeRecordsSlice';
import physicalTrainingReducer from './slices/physicalTrainingSlice';
import semesterRecordReducer from './slices/semesterRecordSlice';
import overallAssessmentReducer from './slices/overallAssessmentSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['officerCadetForm', 'dossierFilling', 'inspSheet', 'personalParticulars', 'ssbReport', 'familyBackground','educationQualification', 'achievements', 'autobiography', 'medicalInfo', 'medicalCategory', 'disciplineRecords', 'parentComm', 'sportsAwards', 'weaponTraining', 'obstacleTraining', 'speedMarch', 'campReviews', 'clubDrill', 'leaveRecords', 'hikeRecords', 'detentionRecords', 'counsellingRecords', 'initialInterview', 'termInterview', 'cfeRecords','physicalTraining', 'semesterRecord', 'overallAssessment'],
};

const rootReducer = combineReducers({
  officerCadetForm: officerCadetFormReducer,
  dossierFilling: dossierFillingReducer,
  inspSheet: inspSheetReducer,
  personalParticulars: personalParticularsReducer,
  ssbReport: ssbReportReducer,
  familyBackground: familyBackgroundReducer,
  educationQualification: educationQualificationReducer,
  achievements: achievementsReducer,
  autobiography: autobiographyReducer,
  medicalInfo: medicalInfoReducer,
  medicalCategory: medicalCategoryReducer,
  disciplineRecords: disciplineRecordsReducer,
  parentComm: parentCommReducer,
  sportsAwards: sportsAwardsReducer,
  weaponTraining: weaponTrainingReducer,
  obstacleTraining: obstacleTrainingReducer,
  speedMarch: speedMarchReducer,
  campReviews: campReviewsReducer,
  clubDrill: clubDrillReducer,
  leaveRecords: leaveRecordsReducer,
  hikeRecords: hikeRecordsReducer,
  detentionRecords: detentionRecordsReducer,
  counsellingRecords: counsellingRecordsReducer,
  initialInterview: initialInterviewReducer,
  termInterview: termInterviewReducer,
  cfeRecords: cfeRecordsReducer,
  physicalTraining: physicalTrainingReducer,
  semesterRecord: semesterRecordReducer,
  overallAssessment: overallAssessmentReducer,
  // Add more form slices here as needed
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;