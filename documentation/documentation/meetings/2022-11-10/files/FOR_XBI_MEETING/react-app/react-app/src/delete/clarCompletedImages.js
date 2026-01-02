import React, { useState } from "react";
import ProgressBar from "./ProgressBar.js";

// dynamic call progress bar.
function CompletedImages() {
  const probar = [
    { min: 1, max: 5 },
    { min: 5, max: 10 },
    { min: 2, max: 5 },
  ];

  return (
    <div>
      <div className="completedImages">Completed Images</div>
      {probar.map((data, index) => {
        return <ProgressBar min={data.min} max={data.max}/>;
      })}
    </div>
  );
}

export default CompletedImages;
