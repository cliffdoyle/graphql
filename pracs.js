const arr =[
    {amount:100},
    {amount:800},
    {amount:400},
    {amount:1800}
]


const total = arr.reduce((sum,transac)=>sum+transac.amount,0)

const hisabu=total/1000

console.log(Math.round(hisabu))
