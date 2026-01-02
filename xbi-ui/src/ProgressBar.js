import React, { useState } from "react";
import PropTypes from "prop-types";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

function ProgressBar({min, max}) {
  const bar = (min/max)* 100;  {/* Calculate and display percentage of bar filled. */}

// Set value of progress bar. (Dynamically call value from database and set to this variable e.g. 4/10.)
const MIN = 10
const MAX = 100

function LinearProgressWithLabel(props) {
  return (
    <Box display="flex" alignItems="center" p={3}>
      <Box width="100%" mr={3}>
        {/* Calculate and display percentage of bar filled. */}
        <LinearProgress variant="determinate" value={(min/max)*100} />
      </Box>
      <Box minWidth={35}>
        {/* Display min slash max beside progress bar. */}
        <Typography variant="body2" color="textSecondary">{`${min}/${max}`}</Typography>
      </Box>
    </Box>
  );
}

LinearProgressWithLabel.propTypes = {
  /**
   * The value of the progress indicator for the determinate and buffer variants.
   * Value between 0 and 100.
   */
  value: PropTypes.number.isRequired
};

  return (
    <div>
      <div className="progressBar">Completed Images</div>
      <LinearProgressWithLabel value={bar} />
    </div>
  );
}

export default ProgressBar;
