import AuthFlowScreen from "../../components/auth/AuthFlowScreen";

const PurchaserLogin = () => {
  return (
    <AuthFlowScreen
      role="purchaser"
      accentColor="#06b6d4"
      backgroundColors={["#eff6ff", "#ffffff", "#dbeafe"]}
      title="Welcome Back"
      subtitle="Sign in to your purchaser account"
      logoSource={require("../../assets/images/main-logo.png")}
      signupRoute="/Purchaser/purchaser-signup"
      signupLabel="Sign Up"
      footerText="Don’t have an account?"
    />
  );
};

export default PurchaserLogin;
