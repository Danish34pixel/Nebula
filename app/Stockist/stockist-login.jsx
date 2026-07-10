import AuthFlowScreen from "../../components/auth/AuthFlowScreen";

export default function StockistLogin() {
  return (
    <AuthFlowScreen
      role="stockist"
      accentColor="#14b8a6"
      backgroundColors={["#faf5ff", "#f0f9ff", "#e0e7ff"]}
      title="Welcome Back"
      subtitle="Sign in to your MedTrap Stockist account"
      logoSource={require("../../assets/images/main-logo.png")}
      signupRoute="/Stockist/stockist-signup"
      signupLabel="Create your account"
      footerText="New to MedTrap?"
    />
  );
}
