const m=document.getElementById('modal');
function demo(){m.classList.add('open')}
function closeModal(){m.classList.remove('open')}
function sent(){document.getElementById('msg').textContent='Demo request captured — connect your email service to send it.'}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

async function loadDatabase(){
  try{
    const r=await fetch('/api/data',{cache:'no-store'});
    const d=await r.json();
    if(!d.ok) throw new Error(d.error);
    const s=d.stats;
    const values=document.querySelectorAll('.stats strong');
    if(values[0]) values[0].textContent='₹'+Number(s.revenue).toLocaleString('en-IN');
    if(values[1]) values[1].textContent=s.orders;
    if(values[2]) values[2].textContent=s.bookings;
    if(values[3]) values[3].textContent=s.customers;
    const orderPanel=document.querySelector('.orders');
    if(orderPanel && d.orders.length){
      orderPanel.innerHTML='<b>Recent orders · Database</b>'+d.orders.map(o=>'<p>#'+o.code+'　 '+o.service+'　 ₹'+Number(o.amount).toLocaleString('en-IN')+'　 <mark>'+o.status+'</mark></p>').join('');
    }
  }catch(e){
    console.warn('FlowDesk database:',e.message);
  }
}

async function createOrder(customer='Website customer',service='New service',amount=0){
  try{
    const r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer,service,amount})});
    const d=await r.json();
    if(!d.ok) throw new Error(d.error);
    closeModal();
    await loadDatabase();
  }catch(e){
    document.getElementById('msg').textContent=e.message;
  }
}

const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.style.opacity=1;e.target.style.transform='translateY(0)'}}),{threshold:.12});
document.querySelectorAll('.cards article,.steps p,.stats div,.panel').forEach(x=>{x.style.opacity=0;x.style.transform='translateY(18px)';x.style.transition='opacity .6s,transform .6s';io.observe(x)});
loadDatabase();