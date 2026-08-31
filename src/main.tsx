import ReactDOM from "react-dom/client";
import App from "./App";
import { CartProvider } from "./CartContext";
import { WishlistProvider } from "./WishlistContext";
import { AuthProvider } from "./AuthContext";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./Toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);
