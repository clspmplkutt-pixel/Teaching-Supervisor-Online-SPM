import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

// Public Auth Routes
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Dashboards & Monitoring
const InfoPage = lazy(() => import('./pages/InfoPage'));
const AdminMonitor = lazy(() => import('./pages/AdminMonitor'));
const SupervisionSummary = lazy(() => import('./pages/SupervisionSummary'));

// Profile, Security & Signature
const EditProfile = lazy(() => import('./pages/EditProfile'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const EditSignature = lazy(() => import('./pages/EditSignature'));

// Core Supervision Workflow (Plan, Clip, Approval, Scoring)
const SendPlan = lazy(() => import('./pages/SendPlan'));
const StatusPlan = lazy(() => import('./pages/StatusPlan'));
const StatusPlanClip = lazy(() => import('./pages/StatusPlanClip'));
const StatusPlanPass = lazy(() => import('./pages/StatusPlanPass'));
const SendClip = lazy(() => import('./pages/SendClip'));
const PlanClip = lazy(() => import('./pages/PlanClip'));
const PlanCheck = lazy(() => import('./pages/PlanCheck'));
const PlanScoring = lazy(() => import('./pages/PlanScoring'));
const ViewScoring = lazy(() => import('./pages/ViewScoring'));
const Appointment = lazy(() => import('./pages/Appointment'));
const ViewAppointment = lazy(() => import('./pages/ViewAppointment'));
const NominateEvaluator = lazy(() => import('./pages/NominateEvaluator'));
const ApproveEvaluator = lazy(() => import('./pages/ApproveEvaluator'));

// User Management, Approvals, Data Health, DMC & Logs
const ConfirmUser = lazy(() => import('./pages/ConfirmUser'));
const CheckupUser = lazy(() => import('./pages/CheckupUser'));
const CheckupUserDuplicate = lazy(() => import('./pages/CheckupUserDuplicate'));
const ManageUserAdmin = lazy(() => import('./pages/ManageUserAdmin'));
const UserAdminAdd = lazy(() => import('./pages/UserAdminAdd'));
const UserAdminEdit = lazy(() => import('./pages/UserAdminEdit'));
const UserAdminChgpwd = lazy(() => import('./pages/UserAdminChgpwd'));
const UserTeacher = lazy(() => import('./pages/UserTeacher'));
const UserDirectorSchool = lazy(() => import('./pages/UserDirectorSchool'));
const UserSchoolAdmin = lazy(() => import('./pages/UserSchoolAdmin'));
const UserHeadDepartment = lazy(() => import('./pages/UserHeadDepartment'));
const UserChairman = lazy(() => import('./pages/UserChairman'));
const UserSupervisor = lazy(() => import('./pages/UserSupervisor'));
const UserSupervision = lazy(() => import('./pages/UserSupervision'));
const UserDistricDirector = lazy(() => import('./pages/UserDistricDirector'));
const UserEdit = lazy(() => import('./pages/UserEdit'));
const ChangePosition = lazy(() => import('./pages/ChangePosition'));
const ResetUserPassword = lazy(() => import('./pages/ResetUserPassword'));
const ImportDMC = lazy(() => import('./pages/ImportDMC'));
const Log = lazy(() => import('./pages/Log'));

// Master Data, Schools, Curriculum Hierarchy, PA Rubrics & System Config
const Khet = lazy(() => import('./pages/Khet'));
const KhetAdd = lazy(() => import('./pages/KhetAdd'));
const KhetEdit = lazy(() => import('./pages/KhetEdit'));
const School = lazy(() => import('./pages/School'));
const SchoolAdd = lazy(() => import('./pages/SchoolAdd'));
const SchoolEdit = lazy(() => import('./pages/SchoolEdit'));
const SchoolSize = lazy(() => import('./pages/SchoolSize'));
const SchoolSizeEdit = lazy(() => import('./pages/SchoolSizeEdit'));
const BudgetYear = lazy(() => import('./pages/BudgetYear'));
const EducationYear = lazy(() => import('./pages/EducationYear'));
const Prefix = lazy(() => import('./pages/Prefix'));
const Gender = lazy(() => import('./pages/Gender'));
const PersonPositionType = lazy(() => import('./pages/PersonPositionType'));
const PersonType = lazy(() => import('./pages/PersonType'));
const AcademicStanding = lazy(() => import('./pages/AcademicStanding'));
const EducationLevel = lazy(() => import('./pages/EducationLevel'));
const TeachSubject = lazy(() => import('./pages/TeachSubject'));
const SubjectType = lazy(() => import('./pages/SubjectType'));
const GradeLevel = lazy(() => import('./pages/GradeLevel'));
const TblConfig = lazy(() => import('./pages/TblConfig'));
const Ability21 = lazy(() => import('./pages/Ability21'));
const Competency = lazy(() => import('./pages/Competency'));
const Desirable = lazy(() => import('./pages/Desirable'));
const TypeBenchmarks = lazy(() => import('./pages/TypeBenchmarks'));
const LearningModel = lazy(() => import('./pages/LearningModel'));
const LearningModelAdd = lazy(() => import('./pages/LearningModelAdd'));
const LearningModelEdit = lazy(() => import('./pages/LearningModelEdit'));
const Strands = lazy(() => import('./pages/Strands'));
const StrandsAdd = lazy(() => import('./pages/StrandsAdd'));
const StrandsEdit = lazy(() => import('./pages/StrandsEdit'));
const ContentStandards = lazy(() => import('./pages/ContentStandards'));
const ContentStandardsAdd = lazy(() => import('./pages/ContentStandardsAdd'));
const ContentStandardsEdit = lazy(() => import('./pages/ContentStandardsEdit'));
const Indicators = lazy(() => import('./pages/Indicators'));
const IndicatorsAdd = lazy(() => import('./pages/IndicatorsAdd'));
const IndicatorsEdit = lazy(() => import('./pages/IndicatorsEdit'));
const PolicySide = lazy(() => import('./pages/PolicySide'));
const PolicyNumber = lazy(() => import('./pages/PolicyNumber'));
const PolicyItems = lazy(() => import('./pages/PolicyItems'));
const ModulePlaceholder = lazy(() => import('./pages/ModulePlaceholder'));

const PageFallback = () => <LoadingSpinner message="กำลังโหลดหน้าจอ..." />;

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/" element={<AppLayout />}>
                <Route index element={<InfoPage />} />
                <Route path="info" element={<InfoPage />} />

                {/* Core Supervision Workflow */}
                <Route path="sendplan" element={<SendPlan />} />
                <Route path="statusplan" element={<StatusPlan />} />
                <Route path="statusplan_clip" element={<StatusPlanClip />} />
                <Route path="statusplan_pass" element={<StatusPlanPass />} />
                <Route path="send_clip" element={<SendClip />} />
                <Route path="plan_clip" element={<PlanClip />} />
                <Route path="Plan_Check" element={<PlanCheck />} />
                <Route path="Plan_scoring" element={<PlanScoring />} />
                <Route path="view_scoring" element={<ViewScoring />} />
                <Route path="appointment" element={<Appointment />} />
                <Route path="view_appointment" element={<ViewAppointment />} />
                <Route path="nominate_evaluator" element={<NominateEvaluator />} />
                <Route path="approve_evaluator" element={<ApproveEvaluator />} />

                {/* Dashboards & Reports */}
                <Route path="admin_monitor" element={<AdminMonitor />} />
                <Route path="supervision_summary" element={<SupervisionSummary />} />

                {/* Profile & Account Security */}
                <Route path="editprofile" element={<EditProfile />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="chgpasswd" element={<ChangePassword />} />
                <Route path="editSignature" element={<EditSignature />} />

                {/* User Management, Approvals, Data Health & DMC */}
                <Route path="confirmUser" element={<ConfirmUser />} />
                <Route path="checkupUser" element={<CheckupUser />} />
                <Route path="checkupUserduplicate" element={<CheckupUserDuplicate />} />
                <Route path="ManageUserAdmin" element={<ManageUserAdmin />} />
                <Route path="UserAdmin_Add" element={<UserAdminAdd />} />
                <Route path="UserAdmin_Edit" element={<UserAdminEdit />} />
                <Route path="UserAdmin_Chgpwd" element={<UserAdminChgpwd />} />
                <Route path="userteacher" element={<UserTeacher />} />
                <Route path="userdirectorschool" element={<UserDirectorSchool />} />
                <Route path="userSchoolAdmin" element={<UserSchoolAdmin />} />
                <Route path="userheadDepartment" element={<UserHeadDepartment />} />
                <Route path="userchairman" element={<UserChairman />} />
                <Route path="usersupervisor" element={<UserSupervisor />} />
                <Route path="usersupervision" element={<UserSupervision />} />
                <Route path="userDistricDirector" element={<UserDistricDirector />} />
                <Route path="teacher_edit" element={<UserEdit variant="teacher" />} />
                <Route path="directorschool_edit" element={<UserEdit variant="directorschool" />} />
                <Route path="supervisor_edit" element={<UserEdit variant="supervisor" />} />
                <Route path="dd_edit" element={<UserEdit variant="dd" />} />
                <Route path="change_position" element={<ChangePosition />} />
                <Route path="reset_user_password" element={<ResetUserPassword />} />
                <Route path="importDMC" element={<ImportDMC />} />
                <Route path="log" element={<Log />} />

                {/* Safe Redirects for Retired Legacy GET-Mutation Routes */}
                <Route path="resetPwd" element={<Navigate to="/reset_user_password" replace />} />
                <Route path="updatepwd" element={<Navigate to="/reset_user_password" replace />} />
                <Route path="user_remove" element={<Navigate to="/userteacher" replace />} />
                <Route path="khet_remove" element={<Navigate to="/khet" replace />} />
                <Route path="school_remove" element={<Navigate to="/school" replace />} />

                {/* Master Data, Schools, Curriculum & PA Config */}
                <Route path="khet" element={<Khet />} />
                <Route path="khet_add" element={<KhetAdd />} />
                <Route path="khet_edit" element={<KhetEdit />} />
                <Route path="school" element={<School />} />
                <Route path="school_add" element={<SchoolAdd />} />
                <Route path="school_edit" element={<SchoolEdit />} />
                <Route path="school_size" element={<SchoolSize />} />
                <Route path="schoolsize_edit" element={<SchoolSizeEdit />} />
                <Route path="budget_year" element={<BudgetYear />} />
                <Route path="education_year" element={<EducationYear />} />
                <Route path="prefix" element={<Prefix />} />
                <Route path="gender" element={<Gender />} />
                <Route path="person_position_type" element={<PersonPositionType />} />
                <Route path="person_type" element={<PersonType />} />
                <Route path="academic_standing" element={<AcademicStanding />} />
                <Route path="education_level" element={<EducationLevel />} />
                <Route path="teach_subject" element={<TeachSubject />} />
                <Route path="subject_type" element={<SubjectType />} />
                <Route path="grade_level" element={<GradeLevel />} />
                <Route path="tbl_config" element={<TblConfig />} />
                <Route path="ability21" element={<Ability21 />} />
                <Route path="competency" element={<Competency />} />
                <Route path="desirable" element={<Desirable />} />
                <Route path="type_benchmarks" element={<TypeBenchmarks />} />
                <Route path="learningModel" element={<LearningModel />} />
                <Route path="learningModel_add" element={<LearningModelAdd />} />
                <Route path="learningModel_edit" element={<LearningModelEdit />} />
                <Route path="strands" element={<Strands />} />
                <Route path="strands_add" element={<StrandsAdd />} />
                <Route path="strands_edit" element={<StrandsEdit />} />
                <Route path="content_standards" element={<ContentStandards />} />
                <Route path="content_standards_add" element={<ContentStandardsAdd />} />
                <Route path="content_standards_edit" element={<ContentStandardsEdit />} />
                <Route path="indicators" element={<Indicators />} />
                <Route path="indicators_add" element={<IndicatorsAdd />} />
                <Route path="indicators_edit" element={<IndicatorsEdit />} />
                <Route path="policy_side" element={<PolicySide />} />
                <Route path="policy_number" element={<PolicyNumber />} />
                <Route path="policy_items" element={<PolicyItems />} />
                <Route path=":module" element={<ModulePlaceholder />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
