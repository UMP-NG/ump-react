import React from "react";
import { Link } from "react-router-dom";

const AlreadyRegistered = () => (
  <>
    <div className="move">
      <p>Already Registered?</p>
      <Link to="/analytics">Sellers Page</Link>
    </div>
    <div className="move">
      <p>Already Registered?</p>
      <Link to="/provideranalytics">Services/Walkers Page</Link>
    </div>
  </>
);

export default AlreadyRegistered;
