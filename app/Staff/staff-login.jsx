import AuthFlowScreen from "../../components/auth/AuthFlowScreen";

export default function StaffLogin() {
  return (
    <AuthFlowScreen
      role="staff"
      accentColor="#9333ea"
      backgroundColors={["#faf5ff", "#f3e8ff", "#e0e7ff"]}
      title="Staff Portal"
      subtitle="Sign in to your MedTrap Staff account"
      logoSource={require("../../assets/images/main-logo.png")}
      signupRoute="/Staff/Createstaff"
      signupLabel="Create your account"
      footerText="New to MedTrap Staff?"
    />
  );
}
