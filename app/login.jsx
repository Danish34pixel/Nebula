import AuthFlowScreen from "../components/auth/AuthFlowScreen";

export default function Login() {
  return (
    <AuthFlowScreen
      role="medicalOwner"
      accentColor="#2563eb"
      backgroundColors={["#eff6ff", "#ffffff", "#f0fdf4"]}
      title="Welcome Back"
      subtitle="Sign in to your MedTrap account"
      logoSource={require("../assets/images/main-logo.png")}
      signupRoute="/MedicalOwner/MedicalSignup"
      signupLabel="Create your account"
      footerText="New to MedTrap?"
    />
  );
}
