export const templates = {
  "direction": [
    {
      "id": "turn_generic",
      "template": "前方 {{distance}} 公尺{{direction}}。",
      "parameters": {
        "distance": [
          "50",
          "100",
          "200",
          "300",
          "500"
        ],
        "direction": [
          "左轉",
          "右轉",
          "向左",
          "向右",
          "靠右",
          "靠左"
        ]
      }
    },
    {
      "id": "turn_now",
      "template": "請{{direction}}。",
      "parameters": {
        "direction": [
          "左轉",
          "右轉"
        ]
      }
    }
  ],
  "distance_info": [
    {
      "id": "destination_distance",
      "template": "距離目的地還有 {{km}} 公里。",
      "parameters": {
        "km": [
          "1",
          "2",
          "3",
          "5"
        ]
      }
    },
    {
      "id": "traveled_distance",
      "template": "您已行駛 {{km}} 公里，請補充水分。",
      "parameters": {
        "km": [
          "3",
          "5",
          "10"
        ]
      }
    }
  ],
  "safety": [
    {
      "id": "intersection_warning",
      "template": "前方是 {{intersection_type}}，請減速慢行。",
      "parameters": {
        "intersection_type": [
          "十字路口",
          "圓環",
          "巷口"
        ]
      }
    },
    {
      "id": "vehicle_alert",
      "template": "請注意{{vehicle_type}}靠近。",
      "parameters": {
        "vehicle_type": [
          "汽車",
          "機車",
          "公車"
        ]
      }
    },
    {
      "id": "night_riding",
      "template": "目前為夜間騎乘，請開啟{{safety_gear}}。",
      "parameters": {
        "safety_gear": [
          "車燈",
          "尾燈"
        ]
      }
    }
  ],
  "road_condition": [
    {
      "id": "slope_warning",
      "template": "前方為{{slope_type}}，請小心騎乘。",
      "parameters": {
        "slope_type": [
          "上坡",
          "下坡"
        ]
      }
    },
    {
      "id": "road_surface",
      "template": "注意，前方路面{{condition}}。",
      "parameters": {
        "condition": [
          "濕滑",
          "顛簸",
          "有積水",
          "有碎石"
        ]
      }
    },
    {
      "id": "construction_notice",
      "template": "前方 {{distance}} 公尺有施工，請{{action}}。",
      "parameters": {
        "distance": [
          "100",
          "200",
          "300"
        ],
        "action": [
          "改道",
          "減速",
          "注意"
        ]
      }
    }
  ],
  "reroute": [
    {
      "id": "off_route",
      "template": "您已偏離路線，正在重新規劃。",
      "parameters": {}
    },
    {
      "id": "reroute_complete",
      "template": "重新路線完成，請繼續{{next_action}}。",
      "parameters": {
        "next_action": [
          "直行",
          "右轉",
          "騎乘"
        ]
      }
    }
  ],
  "advanced": [
    {
      "id": "nearby_service",
      "template": "前方 {{distance}} 公尺有{{poi_type}}，需要停下嗎？",
      "parameters": {
        "distance": [
          "100",
          "200",
          "300"
        ],
        "poi_type": [
          "便利商店",
          "公廁",
          "飲水站"
        ]
      }
    },
    {
      "id": "bike_lane_notice",
      "template": "您即將進入{{lane_type}}，請保持車距。",
      "parameters": {
        "lane_type": [
          "自行車專用道",
          "混合車道"
        ]
      }
    }
  ]
};