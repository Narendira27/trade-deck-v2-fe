import cookies from "js-cookie";
import axios from "axios";
import { API_URL } from "../config/config";

const getTradeData = async () => {
  const auth = cookies.get("auth");
  try {
    const getTradeData = await axios.get(API_URL + "/user/tradeInfo", {
      headers: { Authorization: "Bearer " + auth },
    });
    
    // Ensure the returned data is always an array
    const tradeInfo = getTradeData.data.data;
    const validTradeInfo = Array.isArray(tradeInfo) ? tradeInfo : [];
    
    return { status: "ok", tradeInfo: validTradeInfo };
  } catch {
    return { status: "failed" };
  }
};

export default getTradeData;