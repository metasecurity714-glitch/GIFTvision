(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const STUDENTS_KEY = "classvision_students_v2", ATTENDANCE_KEY = "classvision_attendance_v2";
  const UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e", UART_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
  let students = readJson(STUDENTS_KEY), attendance = readJson(ATTENDANCE_KEY), selectedStudent = null, bleDevice = null, bleCharacteristic = null;
  function readJson(key) { try { const v=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(v)?v:[]; } catch { return []; } }
  function saveData(){localStorage.setItem(STUDENTS_KEY,JSON.stringify(students));localStorage.setItem(ATTENDANCE_KEY,JSON.stringify(attendance));}
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function clean(v,n){return String(v||"").trim().replace(/[|\r\n]/g," ").slice(0,n);}
  function notice(t,type=""){$("notice").textContent=t;$ ("notice").className="notice "+type;}
  function render(){
    $("studentCount").textContent=students.length;
    $("studentRows").innerHTML=students.length?students.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.rollNo)}</td><td>${esc(s.enrolmentNo||"—")}</td><td>${esc(s.branch)}</td><td><button class="btn btn-danger btn-small" data-delete="${esc(s.rollNo)}">Delete</button></td></tr>`).join(""):'<tr><td colspan="5" class="empty">No students registered yet.</td></tr>';
    $("attendanceRows").innerHTML=attendance.length?attendance.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.rollNo)}</td><td>${esc(r.session)}</td><td>${esc(r.date)}</td><td>${esc(r.time)}</td><td><span class="present">Present</span></td></tr>`).join(""):'<tr><td colspan="6" class="empty">No attendance records yet.</td></tr>';
  }
  async function sendBle(status,name="",roll="",att=""){
    if(!bleCharacteristic)return false;
    const data=new TextEncoder().encode([status,clean(name,28),clean(roll,20),clean(att,18)].join("|")+"\n");
    try{if(bleCharacteristic.writeValueWithResponse)await bleCharacteristic.writeValueWithResponse(data);else if(bleCharacteristic.writeValueWithoutResponse)await bleCharacteristic.writeValueWithoutResponse(data);else await bleCharacteristic.writeValue(data);return true;}catch(e){console.error(e);$("bleStatus").textContent="BLE send failed. Reconnect and retry.";return false;}
  }
  function bleUi(on){$("bleBadge").textContent=on?"CONNECTED":"DISCONNECTED";$("bleBadge").className="status-pill "+(on?"online":"offline");$("connectBle").disabled=on;$("disconnectBle").disabled=!on;$("testBle").disabled=!on;}
  async function connectBle(){
    if(!navigator.bluetooth){$("bleStatus").textContent="Web Bluetooth is unavailable. Use Chrome on Android over HTTPS.";notice("This browser does not support Web Bluetooth.","error");return;}
    try{$("connectBle").disabled=true;$("bleStatus").textContent="Select ClassVision-ESP32 in the Bluetooth chooser…";
      bleDevice=await navigator.bluetooth.requestDevice({filters:[{name:"ClassVision-ESP32"}],optionalServices:[UART_SERVICE]});
      bleDevice.addEventListener("gattserverdisconnected",disconnected);
      const server=await bleDevice.gatt.connect(), service=await server.getPrimaryService(UART_SERVICE);
      bleCharacteristic=await service.getCharacteristic(UART_RX);bleUi(true);$("bleStatus").textContent="Connected to "+(bleDevice.name||"ESP32")+". OLED ready.";notice("ESP32 connected. Verified attendance can now be sent to the OLED.","success");await sendBle("READY","","","CONNECTED");
    }catch(e){console.error(e);bleCharacteristic=null;bleUi(false);$("connectBle").disabled=false;$("bleStatus").textContent="Connection cancelled or failed: "+e.message;notice("ESP32 connection was not completed.","error");}
  }
  function disconnected(){bleCharacteristic=null;bleUi(false);$("connectBle").disabled=false;$("bleStatus").textContent="ESP32 disconnected. Tap Connect ESP32 to reconnect.";}
  $("registerForm").addEventListener("submit",e=>{e.preventDefault();const s={name:clean($("studentName").value,60),rollNo:clean($("rollNo").value,24),enrolmentNo:clean($("enrolmentNo").value,32),branch:clean($("branch").value,30)};if(!s.name||!s.rollNo||!s.branch){notice("Enter name, roll number and branch.","error");return;}if(students.some(x=>x.rollNo.toLowerCase()===s.rollNo.toLowerCase())){notice("That roll number is already registered.","error");return;}students.push(s);saveData();render();$("registerForm").reset();notice("Student registered.","success");});
  $("lookupStudent").addEventListener("click",()=>{const roll=clean($("verifyRoll").value,24);selectedStudent=students.find(s=>s.rollNo.toLowerCase()===roll.toLowerCase())||null;$("studentPreview").hidden=!selectedStudent;$("confirmIdentity").checked=false;$("markAttendance").disabled=true;if(!selectedStudent){$("verifyStatus").textContent="No registered student found for that roll number.";notice("Student not found. No attendance recorded.","error");sendBle("NOT_VERIFIED","",roll,"NOT FOUND");return;}$("previewName").textContent=selectedStudent.name;$("previewRoll").textContent=selectedStudent.rollNo;$("previewBranch").textContent=selectedStudent.branch;$("verifyStatus").textContent="Check the student's credential, then confirm below.";notice("Student record found. Operator confirmation is required.","success");});
  $("confirmIdentity").addEventListener("change",()=>{$("markAttendance").disabled=!(selectedStudent&&$("confirmIdentity").checked);});
  $("markAttendance").addEventListener("click",async()=>{if(!selectedStudent||!$("confirmIdentity").checked)return;const session=clean($("sessionName").value,80);if(!session){notice("Enter the attendance session name first.","error");$("sessionName").focus();return;}const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"),key=[date,session.toLowerCase(),selectedStudent.rollNo.toLowerCase()].join("|");if(attendance.some(r=>r.uniqueKey===key)){notice("Duplicate prevented: already marked for this session.","error");$("verifyStatus").textContent="Already marked present for this session.";await sendBle("DUPLICATE",selectedStudent.name,selectedStudent.rollNo,"ALREADY MARKED");return;}attendance.unshift({name:selectedStudent.name,rollNo:selectedStudent.rollNo,session,date,time:d.toLocaleTimeString(),uniqueKey:key});saveData();render();$("verifyStatus").textContent="Verified and marked present: "+selectedStudent.name;notice("Attendance saved for "+selectedStudent.name+".","success");const sent=await sendBle("VERIFIED",selectedStudent.name,selectedStudent.rollNo,"PRESENT");if(sent)$("bleStatus").textContent="Sent "+selectedStudent.name+" ("+selectedStudent.rollNo+") to OLED.";$("confirmIdentity").checked=false;$("markAttendance").disabled=true;});
  $("studentRows").addEventListener("click",e=>{const b=e.target.closest("[data-delete]");if(!b)return;const roll=b.dataset.delete;if(!confirm("Delete student "+roll+"? Existing attendance stays."))return;students=students.filter(s=>s.rollNo!==roll);if(selectedStudent?.rollNo===roll){selectedStudent=null;$("studentPreview").hidden=true;}saveData();render();notice("Student deleted. Historical attendance kept.","success");});
  function csv(filename,rows){if(!rows.length){notice("No data to export yet.","error");return;}const body=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n"),url=URL.createObjectURL(new Blob(["\ufeff"+body],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $("exportCsv").addEventListener("click",()=>csv("classvision-attendance.csv",[["Name","Roll","Session","Date","Time","Status"],...attendance.map(r=>[r.name,r.rollNo,r.session,r.date,r.time,"Present"])]));
  $("exportStudents").addEventListener("click",()=>csv("classvision-students.csv",[["Name","Roll","Enrolment","Branch"],...students.map(s=>[s.name,s.rollNo,s.enrolmentNo,s.branch])]));
  $("connectBle").addEventListener("click",connectBle);$("disconnectBle").addEventListener("click",()=>{if(bleDevice?.gatt?.connected)bleDevice.gatt.disconnect();disconnected();});
  $("testBle").addEventListener("click",async()=>{if(await sendBle("TEST","ClassVision Ready","BLE LINK","CONNECTED"))notice("Test message sent to ESP32 OLED.","success");});
  render();bleUi(false);if(!navigator.bluetooth)$("bleStatus").textContent="Web Bluetooth unavailable. Open the HTTPS site in Chrome on Android.";
})();
