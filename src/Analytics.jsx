import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function Analytics() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Fetch data when component loads
    axios
      .get("http://localhost:8080/interviews/history")
      .then((res) => setData(res.data))
      .catch((err) => console.error("Analytics Error:", err));
  }, []);

  // Don't show anything if there is no data
  if (data.length === 0)
    return (
      <div style={{ padding: "20px", color: "#666" }}>
        <p>
          <i>Complete your first interview to see your progress!</i>
        </p>
      </div>
    );

  return (
    <div
      style={{
        width: "100%",
        height: 250,
        marginBottom: "30px",
        padding: "10px",
        backgroundColor: "white",
        borderRadius: "10px",
        border: "1px solid #eee",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>
        📈 Your Growth Curve
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} hide />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#007aff"
            strokeWidth={3}
            dot={{ fill: "#007aff", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Analytics;
