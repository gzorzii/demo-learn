package com.ciet.demo_learn.shared.uuid;

import com.fasterxml.uuid.Generators;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.generator.BeforeExecutionGenerator;
import org.hibernate.generator.EventType;
import org.hibernate.generator.EventTypeSets;

import java.util.EnumSet;
import java.util.UUID;

public class UuidV7Generator implements BeforeExecutionGenerator {

    @Override
    public EnumSet<EventType> getEventTypes() {
        return EventTypeSets.INSERT_ONLY;
    }

    @Override
    public Object generate(SharedSessionContractImplementor session, Object owner, Object currentValue, EventType eventType) {
        return Generators.timeBasedEpochGenerator().generate();
    }
}
