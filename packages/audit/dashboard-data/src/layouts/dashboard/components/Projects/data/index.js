/* eslint-disable react/prop-types */
/* eslint-disable react/function-component-definition */
/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// @mui material components
import Tooltip from "@mui/material/Tooltip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDProgress from "components/MDProgress";

// Images
import logoXD from "assets/images/small-logos/logo-xd.svg";
import logoAtlassian from "assets/images/small-logos/logo-atlassian.svg";
import logoSlack from "assets/images/small-logos/logo-slack.svg";
import logoSpotify from "assets/images/small-logos/logo-spotify.svg";
import logoJira from "assets/images/small-logos/logo-jira.svg";
import logoInvesion from "assets/images/small-logos/logo-invision.svg";
import team1 from "assets/images/team-1.jpg";
import team2 from "assets/images/team-2.jpg";
import team3 from "assets/images/team-3.jpg";
import team4 from "assets/images/team-4.jpg";

// Import JSON data
import vulnerabilityData from "./vulnerabilities.json";

// Map logo names to imports
const logoMap = {
  "logo-xd": logoXD,
  "logo-atlassian": logoAtlassian,
  "logo-slack": logoSlack,
  "logo-spotify": logoSpotify,
  "logo-jira": logoJira,
  "logo-invision": logoInvesion,
};

// Map team image names to imports
const teamImageMap = {
  "team-1": team1,
  "team-2": team2,
  "team-3": team3,
  "team-4": team4,
};

export default function data() {
  console.log("Vulnerability data loaded:", vulnerabilityData);
  const avatars = (members) =>
    members.map(([image, name]) => (
      <Tooltip key={name} title={name} placeholder="bottom">
        <MDAvatar
          src={image}
          alt="name"
          size="xs"
          sx={{
            border: ({ borders: { borderWidth }, palette: { white } }) =>
              `${borderWidth[2]} solid ${white.main}`,
            cursor: "pointer",
            position: "relative",

            "&:not(:first-of-type)": {
              ml: -1.25,
            },

            "&:hover, &:focus": {
              zIndex: "10",
            },
          }}
        />
      </Tooltip>
    ));

  const Company = ({ image, name }) => (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
      <MDAvatar src={image} name={name} size="sm" />
      <MDTypography variant="button" fontWeight="medium" ml={1} lineHeight={1}>
        {name}
      </MDTypography>
    </MDBox>
  );

  // Transform JSON data to table rows
  const rows = vulnerabilityData.vulnerabilities.map((vuln) => {
    // Determine category color
    let categoryColor = "info";
    if (vuln.category === "critical") {
      categoryColor = "error";
    } else if (vuln.category === "high") {
      categoryColor = "warning";
    } else if (vuln.category === "moderate") {
      categoryColor = "info";
    }

    return {
      companies: <Company image={logoInvesion} name={vuln.packageName} />,
      members: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {vuln.oldVersion}
        </MDTypography>
      ),
      budget: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {vuln.fixedVersion}
        </MDTypography>
      ),
      completion: (
        <MDBox width="8rem" textAlign="center">
          <MDTypography
            variant="button"
            color="text"
            fontWeight="medium"
            sx={{
              background:
                categoryColor === "error"
                  ? "#fde4e4"
                  : categoryColor === "warning"
                  ? "#fff4e6"
                  : "#e3f2fd",
              color:
                categoryColor === "error"
                  ? "#c41c3b"
                  : categoryColor === "warning"
                  ? "#f57c00"
                  : "#0d47a1",
              padding: "4px 8px",
              borderRadius: "4px",
              display: "inline-block",
              textTransform: "capitalize",
            }}
          >
            {vuln.category}
          </MDTypography>
        </MDBox>
      ),
    };
  });

  return {
    columns: [
      { Header: "package name", accessor: "companies", width: "30%", align: "left" },
      { Header: "old version", accessor: "members", width: "20%", align: "left" },
      { Header: "fixed version", accessor: "budget", width: "20%", align: "center" },
      { Header: "category", accessor: "completion", width: "30%", align: "center" },
    ],

    rows,
  };
}
