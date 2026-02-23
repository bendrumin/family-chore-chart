'use client'

import { useState, useEffect } from 'react'

export function Greeting({ familyName }: { familyName: string }) {
  const [greeting, setGreeting] = useState('Welcome')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  return (
    <>
      {greeting}, {familyName}!
    </>
  )
}
