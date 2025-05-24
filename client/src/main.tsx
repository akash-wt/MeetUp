import { GoogleOAuthProvider } from '@react-oauth/google';
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";
import { clientId } from './config';

ReactDOM.createRoot(document.getElementById("root")!).render(

      <GoogleOAuthProvider clientId={clientId}>
            <App />
      </GoogleOAuthProvider>

);
