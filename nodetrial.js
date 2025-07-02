const passy='harry'
const qwell='porter'


const encodede = btoa(`${passy}:${qwell}`)

console.log(encodede)

const decoded = atob(encodede)

console.log(decoded)