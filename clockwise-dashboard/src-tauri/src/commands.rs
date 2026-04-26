use serde::Deserialize;

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct OpenTimerWindowRequest {
    pub monitor_name: Option<String>,
}
