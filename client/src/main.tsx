import { GoogleOAuthProvider } from '@react-oauth/google';
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(

      <GoogleOAuthProvider clientId="1033799994751-6p2i6h2at9punj1faqbjcpp5tu6v1u7v.apps.googleusercontent.com">
            <App />
      </GoogleOAuthProvider>

);
