import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
export default function AuthLayout() {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      minWidth: "100vw",
      backgroundColor: "#f4f4f4"
    }}>
      <div style={{ 
        backgroundColor: "white", 
        padding: "2rem", 
        borderRadius: "8px", 
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        width: "100%",
        
      }}>
        <Navbar />
        <Outlet />
      </div>
    </div>
  );
}
