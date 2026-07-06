import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import SendPlan from './pages/SendPlan';
import StatusPlan from './pages/StatusPlan';
import StatusPlanClip from './pages/StatusPlanClip';
import StatusPlanPass from './pages/StatusPlanPass';
import SendClip from './pages/SendClip';
import EditProfile from './pages/EditProfile';
import ViewScoring from './pages/ViewScoring';
import ChangePassword from './pages/ChangePassword';
import EditSignature from './pages/EditSignature';
import InfoPage from './pages/InfoPage';
import PlanCheck from './pages/PlanCheck';
import PlanScoring from './pages/PlanScoring';
import Appointment from './pages/Appointment';
import ViewAppointment from './pages/ViewAppointment';
import PlanClip from './pages/PlanClip';
import NominateEvaluator from './pages/NominateEvaluator';
import ApproveEvaluator from './pages/ApproveEvaluator';
import ConfirmUser from './pages/ConfirmUser';
import SupervisionSummary from './pages/SupervisionSummary';
import UserTeacher from './pages/UserTeacher';
import UserDirectorSchool from './pages/UserDirectorSchool';
import UserHeadDepartment from './pages/UserHeadDepartment';
import UserChairman from './pages/UserChairman';
import UserSupervisor from './pages/UserSupervisor';
import UserSupervision from './pages/UserSupervision';
import UserDistricDirector from './pages/UserDistricDirector';
import CheckupUser from './pages/CheckupUser';
import CheckupUserDuplicate from './pages/CheckupUserDuplicate';
import ManageUserAdmin from './pages/ManageUserAdmin';
import UserAdminAdd from './pages/UserAdminAdd';
import UserAdminEdit from './pages/UserAdminEdit';
import UserAdminChgpwd from './pages/UserAdminChgpwd';
import AdminProfile from './pages/AdminProfile';
import AdminMonitor from './pages/AdminMonitor';
import UserEdit from './pages/UserEdit';
import UserRemove from './pages/UserRemove';
import ResetPwd from './pages/ResetPwd';
import UpdatePwd from './pages/UpdatePwd';
import ChangePosition from './pages/ChangePosition';
import ResetUserPassword from './pages/ResetUserPassword';
import Khet from './pages/Khet';
import KhetAdd from './pages/KhetAdd';
import KhetEdit from './pages/KhetEdit';
import KhetRemove from './pages/KhetRemove';
import School from './pages/School';
import SchoolAdd from './pages/SchoolAdd';
import SchoolEdit from './pages/SchoolEdit';
import SchoolRemove from './pages/SchoolRemove';
import SchoolSize from './pages/SchoolSize';
import SchoolSizeEdit from './pages/SchoolSizeEdit';
import BudgetYear from './pages/BudgetYear';
import BudgetYearSet from './pages/BudgetYearSet';
import EducationYear from './pages/EducationYear';
import EducationYearSet from './pages/EducationYearSet';
import Prefix from './pages/Prefix';
import PrefixSet from './pages/PrefixSet';
import Gender from './pages/Gender';
import PersonPositionType from './pages/PersonPositionType';
import PersonPositionTypeSet from './pages/PersonPositionTypeSet';
import PersonType from './pages/PersonType';
import PersonTypeSet from './pages/PersonTypeSet';
import AcademicStanding from './pages/AcademicStanding';
import AcademicStandingSet from './pages/AcademicStandingSet';
import EducationLevel from './pages/EducationLevel';
import EducationLevelSet from './pages/EducationLevelSet';
import TeachSubject from './pages/TeachSubject';
import TeachSubjectSet from './pages/TeachSubjectSet';
import SubjectType from './pages/SubjectType';
import SubjectTypeSet from './pages/SubjectTypeSet';
import GradeLevel from './pages/GradeLevel';
import GradeLevelSet from './pages/GradeLevelSet';
import TblConfig from './pages/TblConfig';
import Ability21 from './pages/Ability21';
import Competency from './pages/Competency';
import Desirable from './pages/Desirable';
import LearningModel from './pages/LearningModel';
import LearningModelAdd from './pages/LearningModelAdd';
import LearningModelEdit from './pages/LearningModelEdit';
import Strands from './pages/Strands';
import StrandsAdd from './pages/StrandsAdd';
import StrandsEdit from './pages/StrandsEdit';
import ContentStandards from './pages/ContentStandards';
import ContentStandardsAdd from './pages/ContentStandardsAdd';
import ContentStandardsEdit from './pages/ContentStandardsEdit';
import Indicators from './pages/Indicators';
import IndicatorsAdd from './pages/IndicatorsAdd';
import IndicatorsEdit from './pages/IndicatorsEdit';
import TypeBenchmarks from './pages/TypeBenchmarks';
import PolicySide from './pages/PolicySide';
import PolicyNumber from './pages/PolicyNumber';
import PolicyItems from './pages/PolicyItems';
import ImportDMC from './pages/ImportDMC';
import Log from './pages/Log';
import ModulePlaceholder from './pages/ModulePlaceholder';

import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<InfoPage />} />
            <Route path="info" element={<InfoPage />} />
            <Route path="sendplan" element={<SendPlan />} />
            <Route path="statusplan" element={<StatusPlan />} />
            <Route path="statusplan_clip" element={<StatusPlanClip />} />
            <Route path="statusplan_pass" element={<StatusPlanPass />} />
            <Route path="send_clip" element={<SendClip />} />
            <Route path="editprofile" element={<EditProfile />} />
            <Route path="view_scoring" element={<ViewScoring />} />
            <Route path="chgpasswd" element={<ChangePassword />} />
            <Route path="editSignature" element={<EditSignature />} />
            <Route path="Plan_Check" element={<PlanCheck />} />
            <Route path="Plan_scoring" element={<PlanScoring />} />
            <Route path="appointment" element={<Appointment />} />
            <Route path="view_appointment" element={<ViewAppointment />} />
            <Route path="plan_clip" element={<PlanClip />} />
            <Route path="nominate_evaluator" element={<NominateEvaluator />} />
            <Route path="approve_evaluator" element={<ApproveEvaluator />} />
            <Route path="confirmUser" element={<ConfirmUser />} />
            <Route path="userteacher" element={<UserTeacher />} />
            <Route path="userdirectorschool" element={<UserDirectorSchool />} />
            <Route path="userheadDepartment" element={<UserHeadDepartment />} />
            <Route path="userchairman" element={<UserChairman />} />
            <Route path="usersupervisor" element={<UserSupervisor />} />
            <Route path="usersupervision" element={<UserSupervision />} />
            <Route path="userDistricDirector" element={<UserDistricDirector />} />
            <Route path="checkupUser" element={<CheckupUser />} />
            <Route path="checkupUserduplicate" element={<CheckupUserDuplicate />} />
            <Route path="ManageUserAdmin" element={<ManageUserAdmin />} />
            <Route path="UserAdmin_Add" element={<UserAdminAdd />} />
            <Route path="UserAdmin_Edit" element={<UserAdminEdit />} />
            <Route path="UserAdmin_Chgpwd" element={<UserAdminChgpwd />} />
            <Route path="reset_user_password" element={<ResetUserPassword />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="admin_monitor" element={<AdminMonitor />} />
            <Route path="supervision_summary" element={<SupervisionSummary />} />
            <Route path="teacher_edit" element={<UserEdit variant="teacher" />} />
            <Route path="directorschool_edit" element={<UserEdit variant="directorschool" />} />
            <Route path="supervisor_edit" element={<UserEdit variant="supervisor" />} />
            <Route path="dd_edit" element={<UserEdit variant="dd" />} />
            <Route path="user_remove" element={<UserRemove />} />
            <Route path="resetPwd" element={<ResetPwd />} />
            <Route path="updatepwd" element={<UpdatePwd />} />
            <Route path="change_position" element={<ChangePosition />} />
            <Route path="khet" element={<Khet />} />
            <Route path="khet_add" element={<KhetAdd />} />
            <Route path="khet_edit" element={<KhetEdit />} />
            <Route path="khet_remove" element={<KhetRemove />} />
            <Route path="school" element={<School />} />
            <Route path="school_add" element={<SchoolAdd />} />
            <Route path="school_edit" element={<SchoolEdit />} />
            <Route path="school_remove" element={<SchoolRemove />} />
            <Route path="school_size" element={<SchoolSize />} />
            <Route path="schoolsize_edit" element={<SchoolSizeEdit />} />
            <Route path="budget_year" element={<BudgetYear />} />
            <Route path="budget_year_set" element={<BudgetYearSet />} />
            <Route path="education_year" element={<EducationYear />} />
            <Route path="education_year_set" element={<EducationYearSet />} />
            <Route path="prefix" element={<Prefix />} />
            <Route path="prefix_set" element={<PrefixSet />} />
            <Route path="gender" element={<Gender />} />
            <Route path="person_position_type" element={<PersonPositionType />} />
            <Route path="person_position_type_set" element={<PersonPositionTypeSet />} />
            <Route path="person_type" element={<PersonType />} />
            <Route path="person_type_set" element={<PersonTypeSet />} />
            <Route path="academic_standing" element={<AcademicStanding />} />
            <Route path="academic_standing_set" element={<AcademicStandingSet />} />
            <Route path="education_level" element={<EducationLevel />} />
            <Route path="education_level_set" element={<EducationLevelSet />} />
            <Route path="teach_subject" element={<TeachSubject />} />
            <Route path="teach_subject_set" element={<TeachSubjectSet />} />
            <Route path="subject_type" element={<SubjectType />} />
            <Route path="subject_type_set" element={<SubjectTypeSet />} />
            <Route path="grade_level" element={<GradeLevel />} />
            <Route path="grade_level_set" element={<GradeLevelSet />} />
            <Route path="tbl_config" element={<TblConfig />} />
            <Route path="ability21" element={<Ability21 />} />
            <Route path="competency" element={<Competency />} />
            <Route path="desirable" element={<Desirable />} />
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
            <Route path="type_benchmarks" element={<TypeBenchmarks />} />
            <Route path="policy_side" element={<PolicySide />} />
            <Route path="policy_number" element={<PolicyNumber />} />
            <Route path="policy_items" element={<PolicyItems />} />
            <Route path="importDMC" element={<ImportDMC />} />
            <Route path="log" element={<Log />} />
            <Route path=":module" element={<ModulePlaceholder />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
